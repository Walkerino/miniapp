package service

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"net"
	"net/url"
	"strings"
	"time"

	"miniapp-service/internal/models"
	pkg_dto "miniapp-service/internal/pkg"
	"miniapp-service/internal/repository/postgres"

	"github.com/google/uuid"
)

var (
	ErrForbidden  = errors.New("forbidden")
	ErrNotFound   = errors.New("not found")
	ErrBadRequest = errors.New("bad request")
)

var validMiniappCategories = map[string]struct{}{
	"Finance":                      {},
	"E-commerce":                   {},
	"Food & Delivery":              {},
	"Transport & Travel":           {},
	"Government & Public Services": {},
	"Education":                    {},
	"Healthcare":                   {},
	"Entertainment & Media":        {},
	"Business & Productivity":      {},
	"Utilities & Lifestyle":        {},
}

type MiniappRepository interface {
	List(userID uuid.UUID, page, limit int, status, search string, includeDeleted bool) ([]models.Miniapp, int, error)
	ListFavorites(userID uuid.UUID, page, limit int) ([]models.Miniapp, int, error)
	Create(app *models.Miniapp) error
	Get(id, userID uuid.UUID) (*models.Miniapp, error)
	Update(app *models.Miniapp) error
	SetStatus(id, userID uuid.UUID, status string) (*models.Miniapp, error)
	SetStatusReason(id, userID uuid.UUID, status string, rejectReason *string) (*models.Miniapp, error)
	DeletePending(id uuid.UUID) error
	Metrics() (*models.AdminMetrics, error)
	AddFavorite(userID, miniappID uuid.UUID) (time.Time, error)
	RemoveFavorite(userID, miniappID uuid.UUID) error
}

type AuditRepository interface {
	Create(log *models.AuditLog) error
	List(page, limit int) ([]models.AuditLog, int, error)
}

type LaunchRepository interface {
	CreateToken(token *models.LaunchToken) error
	CreateLaunch(miniappID, userID uuid.UUID, userAgent, ipAddress string) error
	GetSession(tokenHash string) (*models.LaunchToken, string, error)
}

type Service struct {
	miniapps MiniappRepository
	audit    AuditRepository
	launches LaunchRepository
	tokenTTL time.Duration
}

func NewService(miniapps MiniappRepository, audit AuditRepository, launches LaunchRepository, tokenTTL time.Duration) *Service {
	return &Service{miniapps: miniapps, audit: audit, launches: launches, tokenTTL: tokenTTL}
}

func (s *Service) ListActive(user *pkg_dto.UserContext, page, limit int, search string) (*pkg_dto.MiniappListResponse, error) {
	userID, err := parseUserID(user)
	if err != nil {
		return nil, err
	}
	items, total, err := s.miniapps.List(userID, page, limit, "", strings.TrimSpace(search), false)
	if err != nil {
		return nil, err
	}
	return listResponse(items, page, limit, total), nil
}

func (s *Service) Suggest(user *pkg_dto.UserContext, req pkg_dto.CreateMiniappRequest) (*pkg_dto.MiniappResponse, error) {
	userID, err := parseUserID(user)
	if err != nil {
		return nil, err
	}
	title, description, appURL, category, err := validateCreate(req.Title, req.Description, req.URL, req.Category)
	if err != nil {
		return nil, err
	}
	now := time.Now().UTC()
	app := &models.Miniapp{
		ID:          uuid.New(),
		Title:       title,
		Description: description,
		URL:         appURL,
		Category:    category,
		Status:      "pending",
		CreatedBy:   userID,
		CreatedAt:   now,
		UpdatedAt:   now,
	}
	if err := s.miniapps.Create(app); err != nil {
		return nil, err
	}
	s.createAuditLog(userID, user, "suggested", app)
	resp := miniappResponse(app)
	return &resp, nil
}

func (s *Service) GetActive(user *pkg_dto.UserContext, id string) (*pkg_dto.MiniappResponse, error) {
	userID, miniappID, err := parseUserAndMiniapp(user, id)
	if err != nil {
		return nil, err
	}
	app, err := s.miniapps.Get(miniappID, userID)
	if err != nil {
		return nil, mapRepoErr(err)
	}
	if app.Status != "active" {
		return nil, ErrForbidden
	}
	resp := miniappResponse(app)
	return &resp, nil
}

func (s *Service) Launch(user *pkg_dto.UserContext, id, userAgent, ipAddress string) (*pkg_dto.LaunchMiniappResponse, error) {
	userID, miniappID, err := parseUserAndMiniapp(user, id)
	if err != nil {
		return nil, err
	}
	app, err := s.miniapps.Get(miniappID, userID)
	if err != nil {
		return nil, mapRepoErr(err)
	}
	if app.Status != "active" {
		return nil, ErrForbidden
	}

	rawToken, err := secureToken()
	if err != nil {
		return nil, err
	}
	expiresAt := time.Now().UTC().Add(s.tokenTTL)
	token := &models.LaunchToken{
		ID:        uuid.New(),
		MiniappID: miniappID,
		UserID:    userID,
		UserEmail: user.Email,
		UserName:  user.Name,
		UserRole:  user.Role,
		TokenHash: hashToken(rawToken),
		ExpiresAt: expiresAt,
		CreatedAt: time.Now().UTC(),
	}
	if err := s.launches.CreateToken(token); err != nil {
		return nil, err
	}
	if err := s.launches.CreateLaunch(miniappID, userID, userAgent, ipAddress); err != nil {
		return nil, err
	}
	s.createAuditLog(userID, user, "launched", app)

	launchURL, err := appendLaunchToken(app.URL, rawToken)
	if err != nil {
		return nil, err
	}
	return &pkg_dto.LaunchMiniappResponse{
		LaunchURL:   launchURL,
		LaunchToken: rawToken,
		ExpiresAt:   expiresAt,
	}, nil
}

func (s *Service) AddFavorite(user *pkg_dto.UserContext, id string) (*pkg_dto.FavoriteResponse, error) {
	userID, miniappID, err := parseUserAndMiniapp(user, id)
	if err != nil {
		return nil, err
	}
	app, err := s.miniapps.Get(miniappID, userID)
	if err != nil {
		return nil, mapRepoErr(err)
	}
	createdAt, err := s.miniapps.AddFavorite(userID, miniappID)
	if err != nil {
		return nil, mapRepoErr(err)
	}
	s.createAuditLog(userID, user, "favorited", app)
	return &pkg_dto.FavoriteResponse{UserID: userID.String(), MiniappID: miniappID.String(), CreatedAt: createdAt}, nil
}

func (s *Service) RemoveFavorite(user *pkg_dto.UserContext, id string) error {
	userID, miniappID, err := parseUserAndMiniapp(user, id)
	if err != nil {
		return err
	}
	app, err := s.miniapps.Get(miniappID, userID)
	if err != nil {
		return mapRepoErr(err)
	}
	if err := s.miniapps.RemoveFavorite(userID, miniappID); err != nil {
		return mapRepoErr(err)
	}
	s.createAuditLog(userID, user, "unfavorited", app)
	return nil
}

func (s *Service) ListFavorites(user *pkg_dto.UserContext, page, limit int) (*pkg_dto.MiniappListResponse, error) {
	userID, err := parseUserID(user)
	if err != nil {
		return nil, err
	}
	items, total, err := s.miniapps.ListFavorites(userID, page, limit)
	if err != nil {
		return nil, err
	}
	return listResponse(items, page, limit, total), nil
}

func (s *Service) ListAll(user *pkg_dto.UserContext, page, limit int, status, search string) (*pkg_dto.MiniappListResponse, error) {
	if err := requireAdmin(user); err != nil {
		return nil, err
	}
	userID, err := parseUserID(user)
	if err != nil {
		return nil, err
	}
	status = strings.TrimSpace(status)
	if status != "" && !validStatus(status) {
		return nil, ErrBadRequest
	}
	items, total, err := s.miniapps.List(userID, page, limit, status, strings.TrimSpace(search), true)
	if err != nil {
		return nil, err
	}
	return listResponse(items, page, limit, total), nil
}

func (s *Service) AdminCreate(user *pkg_dto.UserContext, req pkg_dto.AdminCreateMiniappRequest) (*pkg_dto.MiniappResponse, error) {
	if err := requireAdmin(user); err != nil {
		return nil, err
	}
	userID, err := parseUserID(user)
	if err != nil {
		return nil, err
	}
	title, description, appURL, category, err := validateCreate(req.Title, req.Description, req.URL, req.Category)
	if err != nil {
		return nil, err
	}
	status := strings.TrimSpace(req.Status)
	if status == "" {
		status = "active"
	}
	if !validStatus(status) || status == "deleted" {
		return nil, ErrBadRequest
	}
	now := time.Now().UTC()
	app := &models.Miniapp{
		ID:          uuid.New(),
		Title:       title,
		Description: description,
		URL:         appURL,
		Category:    category,
		Status:      status,
		CreatedBy:   userID,
		CreatedAt:   now,
		UpdatedAt:   now,
	}
	if err := s.miniapps.Create(app); err != nil {
		return nil, err
	}
	s.createAuditLog(userID, user, "created", app)
	resp := miniappResponse(app)
	return &resp, nil
}

func (s *Service) AdminGet(user *pkg_dto.UserContext, id string) (*pkg_dto.MiniappResponse, error) {
	if err := requireAdmin(user); err != nil {
		return nil, err
	}
	userID, miniappID, err := parseUserAndMiniapp(user, id)
	if err != nil {
		return nil, err
	}
	app, err := s.miniapps.Get(miniappID, userID)
	if err != nil {
		return nil, mapRepoErr(err)
	}
	resp := miniappResponse(app)
	return &resp, nil
}

func (s *Service) AdminUpdate(user *pkg_dto.UserContext, id string, req pkg_dto.UpdateMiniappRequest) (*pkg_dto.MiniappResponse, error) {
	if err := requireAdmin(user); err != nil {
		return nil, err
	}
	userID, miniappID, err := parseUserAndMiniapp(user, id)
	if err != nil {
		return nil, err
	}
	app, err := s.miniapps.Get(miniappID, userID)
	if err != nil {
		return nil, mapRepoErr(err)
	}
	previousStatus := app.Status
	auditAction := "updated"
	if req.Title != nil {
		title := strings.TrimSpace(*req.Title)
		if title == "" {
			return nil, ErrBadRequest
		}
		app.Title = title
	}
	if req.Description != nil {
		app.Description = cleanDescription(req.Description)
	}
	if req.URL != nil {
		appURL, err := validateURL(*req.URL)
		if err != nil {
			return nil, err
		}
		app.URL = appURL
	}
	if req.Category != nil {
		category, err := validateCategory(*req.Category)
		if err != nil {
			return nil, err
		}
		app.Category = category
	}
	if req.Status != nil {
		status := strings.TrimSpace(*req.Status)
		if !validStatus(status) {
			return nil, ErrBadRequest
		}
		app.Status = status
		if status != previousStatus {
			auditAction = actionForStatusChange(previousStatus, status)
		}
	}
	app.UpdatedBy = &userID
	if err := s.miniapps.Update(app); err != nil {
		return nil, mapRepoErr(err)
	}
	updated, err := s.miniapps.Get(miniappID, userID)
	if err != nil {
		return nil, mapRepoErr(err)
	}
	s.createAuditLog(userID, user, auditAction, updated)
	resp := miniappResponse(updated)
	return &resp, nil
}

func (s *Service) AdminDelete(user *pkg_dto.UserContext, id string) error {
	_, err := s.SetStatus(user, id, "deleted")
	return err
}

func (s *Service) SetStatus(user *pkg_dto.UserContext, id, status string) (*pkg_dto.MiniappResponse, error) {
	if err := requireAdmin(user); err != nil {
		return nil, err
	}
	userID, miniappID, err := parseUserAndMiniapp(user, id)
	if err != nil {
		return nil, err
	}
	if !validStatus(status) {
		return nil, ErrBadRequest
	}
	oldApp, err := s.miniapps.Get(miniappID, userID)
	if err != nil {
		return nil, mapRepoErr(err)
	}
	app, err := s.miniapps.SetStatus(miniappID, userID, status)
	if err != nil {
		return nil, mapRepoErr(err)
	}
	s.createAuditLog(userID, user, actionForStatusChange(oldApp.Status, status), app)
	resp := miniappResponse(app)
	return &resp, nil
}

func (s *Service) Reject(user *pkg_dto.UserContext, id string) error {
	if err := requireAdmin(user); err != nil {
		return err
	}
	userID, miniappID, err := parseUserAndMiniapp(user, id)
	if err != nil {
		return err
	}
	app, err := s.miniapps.Get(miniappID, userID)
	if err != nil {
		return mapRepoErr(err)
	}
	if app.Status != "pending" {
		return ErrBadRequest
	}
	if err := s.miniapps.DeletePending(miniappID); err != nil {
		return mapRepoErr(err)
	}
	s.createAuditLog(userID, user, "rejected", app)
	return nil
}

func (s *Service) AdminMetrics(user *pkg_dto.UserContext) (*pkg_dto.AdminMetricsResponse, error) {
	if err := requireAdmin(user); err != nil {
		return nil, err
	}
	metrics, err := s.miniapps.Metrics()
	if err != nil {
		return nil, err
	}
	return &pkg_dto.AdminMetricsResponse{
		TotalMiniapps:    metrics.TotalMiniapps,
		ActiveMiniapps:   metrics.ActiveMiniapps,
		PendingMiniapps:  metrics.PendingMiniapps,
		RejectedMiniapps: metrics.RejectedMiniapps,
		TotalLaunches:    metrics.TotalLaunches,
		LaunchesToday:    metrics.LaunchesToday,
		LaunchesThisWeek: metrics.LaunchesThisWeek,
	}, nil
}

func (s *Service) AuditLogs(user *pkg_dto.UserContext, page int) (*pkg_dto.AuditLogListResponse, error) {
	if err := requireAdmin(user); err != nil {
		return nil, err
	}
	if page < 1 {
		page = 1
	}
	const limit = 20
	items, total, err := s.audit.List(page, limit)
	if err != nil {
		return nil, err
	}
	return auditLogListResponse(items, page, limit, total), nil
}

func (s *Service) Session(launchToken string) (*pkg_dto.MiniappSessionContext, error) {
	launchToken = strings.TrimSpace(launchToken)
	if launchToken == "" {
		return nil, ErrNotFound
	}
	token, miniappTitle, err := s.launches.GetSession(hashToken(launchToken))
	if err != nil {
		return nil, mapRepoErr(err)
	}
	return &pkg_dto.MiniappSessionContext{
		User: pkg_dto.MiniappSessionUser{
			ID:    token.UserID.String(),
			Email: token.UserEmail,
			Name:  token.UserName,
			Role:  token.UserRole,
		},
		Miniapp: pkg_dto.MiniappSessionApp{
			ID:    token.MiniappID.String(),
			Title: miniappTitle,
		},
		ExpiresAt: token.ExpiresAt,
	}, nil
}

func requireAdmin(user *pkg_dto.UserContext) error {
	if user == nil || user.Role != "admin" {
		return ErrForbidden
	}
	return nil
}

func parseUserID(user *pkg_dto.UserContext) (uuid.UUID, error) {
	if user == nil {
		return uuid.Nil, ErrForbidden
	}
	id, err := uuid.Parse(user.ID)
	if err != nil {
		return uuid.Nil, ErrBadRequest
	}
	return id, nil
}

func parseUserAndMiniapp(user *pkg_dto.UserContext, id string) (uuid.UUID, uuid.UUID, error) {
	userID, err := parseUserID(user)
	if err != nil {
		return uuid.Nil, uuid.Nil, err
	}
	miniappID, err := uuid.Parse(strings.TrimSpace(id))
	if err != nil {
		return uuid.Nil, uuid.Nil, ErrBadRequest
	}
	return userID, miniappID, nil
}

func validateCreate(title string, description *string, rawURL, rawCategory string) (string, *string, string, string, error) {
	title = strings.TrimSpace(title)
	if title == "" {
		return "", nil, "", "", ErrBadRequest
	}
	appURL, err := validateURL(rawURL)
	if err != nil {
		return "", nil, "", "", err
	}
	category, err := validateCategory(rawCategory)
	if err != nil {
		return "", nil, "", "", err
	}
	return title, cleanDescription(description), appURL, category, nil
}

func validateCategory(raw string) (string, error) {
	category := strings.TrimSpace(raw)
	if _, ok := validMiniappCategories[category]; !ok {
		return "", ErrBadRequest
	}
	return category, nil
}

func cleanDescription(description *string) *string {
	if description == nil {
		return nil
	}
	value := strings.TrimSpace(*description)
	if value == "" {
		return nil
	}
	return &value
}

func validateURL(raw string) (string, error) {
	parsed, err := url.Parse(strings.TrimSpace(raw))
	if err != nil || parsed.Scheme != "https" || parsed.Host == "" {
		return "", ErrBadRequest
	}
	host := strings.ToLower(parsed.Hostname())
	if host == "localhost" || strings.HasSuffix(host, ".localhost") || strings.HasSuffix(host, ".local") {
		return "", ErrBadRequest
	}
	switch host {
	case "auth-service", "api-service", "miniapp-service", "auth-db", "miniapp-db":
		return "", ErrBadRequest
	}
	if ip := net.ParseIP(host); ip != nil && !isPublicIP(ip) {
		return "", ErrBadRequest
	}
	return parsed.String(), nil
}

func isPublicIP(ip net.IP) bool {
	if ip.IsLoopback() || ip.IsPrivate() || ip.IsLinkLocalUnicast() || ip.IsLinkLocalMulticast() || ip.IsUnspecified() || ip.IsMulticast() {
		return false
	}
	return true
}

func validStatus(status string) bool {
	switch status {
	case "pending", "active", "disabled", "deleted", "rejected":
		return true
	default:
		return false
	}
}

func secureToken() (string, error) {
	buf := make([]byte, 32)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(buf), nil
}

func hashToken(token string) string {
	sum := sha256.Sum256([]byte(strings.TrimSpace(token)))
	return hex.EncodeToString(sum[:])
}

func appendLaunchToken(rawURL, token string) (string, error) {
	parsed, err := url.Parse(rawURL)
	if err != nil {
		return "", err
	}
	q := parsed.Query()
	q.Set("launch_token", token)
	parsed.RawQuery = q.Encode()
	return parsed.String(), nil
}

func mapRepoErr(err error) error {
	if err == nil {
		return nil
	}
	if errors.Is(err, postgres.ErrNotFound) {
		return ErrNotFound
	}
	return err
}

func listResponse(items []models.Miniapp, page, limit, total int) *pkg_dto.MiniappListResponse {
	resp := &pkg_dto.MiniappListResponse{Items: make([]pkg_dto.MiniappResponse, 0, len(items)), Page: page, Limit: limit, Total: total}
	for i := range items {
		resp.Items = append(resp.Items, miniappResponse(&items[i]))
	}
	return resp
}

func auditLogListResponse(items []models.AuditLog, page, limit, total int) *pkg_dto.AuditLogListResponse {
	resp := &pkg_dto.AuditLogListResponse{Items: make([]pkg_dto.AuditLogResponse, 0, len(items)), Page: page, Limit: limit, Total: total}
	for i := range items {
		resp.Items = append(resp.Items, auditLogResponse(&items[i]))
	}
	return resp
}

func auditLogResponse(log *models.AuditLog) pkg_dto.AuditLogResponse {
	role := displayRole(log.ActorRole)
	return pkg_dto.AuditLogResponse{
		ID:          log.ID.String(),
		ActorID:     log.ActorID.String(),
		ActorRole:   log.ActorRole,
		ActorEmail:  log.ActorEmail,
		Action:      log.Action,
		MiniappID:   log.MiniappID.String(),
		MiniappName: log.MiniappName,
		Category:    log.Category,
		Message:     role + " " + log.ActorEmail + " " + log.Action + " miniapp " + log.MiniappName + " " + log.Category,
		CreatedAt:   log.CreatedAt,
	}
}

func (s *Service) createAuditLog(actorID uuid.UUID, user *pkg_dto.UserContext, action string, app *models.Miniapp) {
	if s.audit == nil || app == nil {
		return
	}
	_ = s.audit.Create(&models.AuditLog{
		ActorID:     actorID,
		ActorRole:   user.Role,
		ActorEmail:  user.Email,
		Action:      action,
		MiniappID:   app.ID,
		MiniappName: app.Title,
		Category:    app.Category,
	})
}

func actionForStatusChange(previousStatus, nextStatus string) string {
	switch nextStatus {
	case "active":
		if previousStatus == "disabled" {
			return "enabled"
		}
		return "published"
	case "disabled":
		return "disabled"
	case "deleted":
		return "deleted"
	case "rejected":
		return "rejected"
	default:
		return "updated"
	}
}

func displayRole(role string) string {
	role = strings.TrimSpace(role)
	if role == "" {
		return ""
	}
	return strings.ToUpper(role[:1]) + role[1:]
}

func miniappResponse(app *models.Miniapp) pkg_dto.MiniappResponse {
	var updatedBy *string
	if app.UpdatedBy != nil {
		value := app.UpdatedBy.String()
		updatedBy = &value
	}
	return pkg_dto.MiniappResponse{
		ID:            app.ID.String(),
		Title:         app.Title,
		Description:   app.Description,
		URL:           app.URL,
		Category:      app.Category,
		Status:        app.Status,
		RejectReason:  app.RejectReason,
		CreatedBy:     app.CreatedBy.String(),
		UpdatedBy:     updatedBy,
		LaunchesCount: app.LaunchesCount,
		IsFavorite:    app.IsFavorite,
		CreatedAt:     app.CreatedAt,
		UpdatedAt:     app.UpdatedAt,
	}
}
