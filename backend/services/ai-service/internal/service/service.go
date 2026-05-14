package service

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"ai-service/internal/llm"
	"ai-service/internal/models"
	pkg_dto "ai-service/internal/pkg"
	"ai-service/internal/repository/postgres"

	"github.com/google/uuid"
)

var (
	ErrBadRequest = errors.New("bad request")
	ErrNotFound   = errors.New("not found")
)

type BadRequestError struct {
	Message string
}

func (e BadRequestError) Error() string {
	return e.Message
}

func (e BadRequestError) Is(target error) bool {
	return target == ErrBadRequest
}

type GeneratedAppRepository interface {
	Create(app *models.GeneratedApp) error
	Get(id, userID uuid.UUID) (*models.GeneratedApp, error)
	GetConfig(id, userID uuid.UUID) (json.RawMessage, error)
}

type LLMClient interface {
	GenerateConfig(ctx context.Context, prompt string) (json.RawMessage, error)
}

type Service struct {
	repo              GeneratedAppRepository
	llm               LLMClient
	miniappServiceURL string
	client            *http.Client
}

func NewService(repo GeneratedAppRepository, llm LLMClient, miniappServiceURL string) *Service {
	return &Service{
		repo:              repo,
		llm:               llm,
		miniappServiceURL: strings.TrimRight(miniappServiceURL, "/"),
		client:            &http.Client{Timeout: 10 * time.Second},
	}
}

func (s *Service) Generate(ctx context.Context, user *pkg_dto.UserContext, req pkg_dto.GenerateRequest) (*pkg_dto.GeneratedAppResponse, error) {
	userID, err := parseUserID(user)
	if err != nil {
		return nil, err
	}
	prompt := strings.TrimSpace(req.Prompt)
	if prompt == "" {
		return nil, BadRequestError{Message: "prompt is required"}
	}

	config, err := s.llm.GenerateConfig(ctx, prompt)
	if err != nil {
		if errors.Is(err, llm.ErrTimeout) {
			config = fallbackConfigFromPrompt(prompt)
		} else {
			return nil, err
		}
	}

	appConfig, normalizedConfig, err := validateConfig(config, prompt)
	if err != nil {
		return nil, err
	}

	generatedAppID := uuid.New()
	miniapp, err := s.createMiniapp(ctx, user, generatedAppID, appConfig)
	if err != nil {
		return nil, err
	}

	status := "active"
	generated := &models.GeneratedApp{
		ID:          generatedAppID,
		UserID:      userID,
		Prompt:      prompt,
		Title:       appConfig.Title,
		Description: appConfig.Description,
		Config:      normalizedConfig,
		Status:      status,
		MiniappID:   &miniapp.ID,
	}
	if err := s.repo.Create(generated); err != nil {
		return nil, err
	}

	resp := generatedAppResponse(generated)
	return &resp, nil
}

func (s *Service) Get(user *pkg_dto.UserContext, id string) (*pkg_dto.GeneratedAppResponse, error) {
	userID, generatedAppID, err := parseUserAndGeneratedApp(user, id)
	if err != nil {
		return nil, err
	}
	app, err := s.repo.Get(generatedAppID, userID)
	if err != nil {
		return nil, mapRepoErr(err)
	}
	resp := generatedAppResponse(app)
	return &resp, nil
}

func (s *Service) GetConfig(user *pkg_dto.UserContext, id string) (json.RawMessage, error) {
	userID, generatedAppID, err := parseUserAndGeneratedApp(user, id)
	if err != nil {
		return nil, err
	}
	config, err := s.repo.GetConfig(generatedAppID, userID)
	if err != nil {
		return nil, mapRepoErr(err)
	}
	return config, nil
}

func (s *Service) createMiniapp(ctx context.Context, user *pkg_dto.UserContext, generatedAppID uuid.UUID, appConfig miniappConfig) (*miniappResponse, error) {
	requestBody := createMiniappRequest{
		Title:       appConfig.Title,
		Description: appConfig.Description,
		URL:         "/generated-apps/" + generatedAppID.String(),
		Category:    categoryForTheme(appConfig.Theme),
	}
	payload, err := json.Marshal(requestBody)
	if err != nil {
		return nil, err
	}

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, s.miniappServiceURL+"/miniapps", bytes.NewReader(payload))
	if err != nil {
		return nil, err
	}
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("X-User-ID", user.ID)
	httpReq.Header.Set("X-User-Email", user.Email)
	httpReq.Header.Set("X-User-Role", user.Role)
	if user.Name != nil {
		httpReq.Header.Set("X-User-Name", *user.Name)
	}

	resp, err := s.client.Do(httpReq)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("miniapp-service request failed with status %d", resp.StatusCode)
	}

	var created miniappResponse
	if err := json.NewDecoder(resp.Body).Decode(&created); err != nil {
		return nil, err
	}
	if created.ID == uuid.Nil {
		return nil, errors.New("miniapp-service returned empty id")
	}
	return &created, nil
}

func parseUserID(user *pkg_dto.UserContext) (uuid.UUID, error) {
	if user == nil {
		return uuid.Nil, ErrBadRequest
	}
	id, err := uuid.Parse(user.ID)
	if err != nil {
		return uuid.Nil, ErrBadRequest
	}
	return id, nil
}

func parseUserAndGeneratedApp(user *pkg_dto.UserContext, id string) (uuid.UUID, uuid.UUID, error) {
	userID, err := parseUserID(user)
	if err != nil {
		return uuid.Nil, uuid.Nil, err
	}
	appID, err := uuid.Parse(strings.TrimSpace(id))
	if err != nil {
		return uuid.Nil, uuid.Nil, ErrBadRequest
	}
	return userID, appID, nil
}

func validateConfig(config json.RawMessage, prompt string) (miniappConfig, json.RawMessage, error) {
	var parsed miniappConfig
	if err := json.Unmarshal(config, &parsed); err != nil {
		return parsed, nil, BadRequestError{Message: "generated config is not valid JSON object"}
	}
	parsed.Title = strings.TrimSpace(parsed.Title)
	parsed.Name = strings.TrimSpace(parsed.Name)
	parsed.Description = strings.TrimSpace(parsed.Description)
	if parsed.Title == "" {
		parsed.Title = parsed.Name
	}
	if parsed.Title == "" && len(parsed.Pages) > 0 {
		parsed.Title = strings.TrimSpace(parsed.Pages[0].Title)
	}
	if parsed.Title == "" {
		parsed.Title = titleFromPrompt(prompt)
	}
	if parsed.Description == "" {
		parsed.Description = "Generated miniapp for: " + strings.TrimSpace(prompt)
	}
	if len(parsed.Pages) == 0 {
		parsed.Pages = []miniappPage{
			{
				ID:    "main",
				Title: "Main",
				Components: []any{
					map[string]string{
						"type":  "text",
						"value": parsed.Description,
					},
				},
			},
		}
	}
	for index := range parsed.Pages {
		parsed.Pages[index].ID = strings.TrimSpace(parsed.Pages[index].ID)
		parsed.Pages[index].Title = strings.TrimSpace(parsed.Pages[index].Title)
		if parsed.Pages[index].ID == "" {
			parsed.Pages[index].ID = fmt.Sprintf("page-%d", index+1)
		}
		if parsed.Pages[index].Title == "" {
			parsed.Pages[index].Title = "Page"
		}
		if len(parsed.Pages[index].Components) == 0 {
			parsed.Pages[index].Components = []any{
				map[string]string{
					"type":  "text",
					"value": parsed.Description,
				},
			}
		}
	}
	normalized, err := json.Marshal(parsed)
	if err != nil {
		return parsed, nil, err
	}
	return parsed, normalized, nil
}

func titleFromPrompt(prompt string) string {
	value := strings.TrimSpace(prompt)
	if value == "" {
		return "Generated MiniApp"
	}
	value = strings.Trim(value, ".!?")
	words := strings.Fields(value)
	if len(words) > 6 {
		words = words[:6]
	}
	return strings.Join(words, " ")
}

func fallbackConfigFromPrompt(prompt string) json.RawMessage {
	title := titleFromPrompt(prompt)
	description := "Generated miniapp for: " + strings.TrimSpace(prompt)
	config := miniappConfig{
		Title:       title,
		Description: description,
		IconPrompt:  "Simple app icon for " + title,
		Theme:       "Utilities & Lifestyle",
		Pages: []miniappPage{
			{
				ID:    "main",
				Title: "Main",
				Components: []any{
					map[string]string{
						"type":  "text",
						"value": description,
					},
					map[string]string{
						"type":       "input",
						"name":       "item",
						"label":      "Item",
						"input_type": "text",
					},
					map[string]string{
						"type":   "button",
						"label":  "Add item",
						"action": "add_item",
						"target": "items",
					},
					map[string]any{
						"type":   "list",
						"name":   "items",
						"source": "items",
						"options": []string{
							"New item",
						},
					},
				},
			},
		},
	}
	payload, err := json.Marshal(config)
	if err != nil {
		return json.RawMessage(`{"title":"Generated MiniApp","description":"Generated fallback miniapp","theme":"Utilities & Lifestyle","pages":[{"id":"main","title":"Main","components":[{"type":"text","value":"Generated fallback miniapp"}]}]}`)
	}
	return payload
}

func generatedAppResponse(app *models.GeneratedApp) pkg_dto.GeneratedAppResponse {
	var miniappID *string
	if app.MiniappID != nil {
		value := app.MiniappID.String()
		miniappID = &value
	}
	return pkg_dto.GeneratedAppResponse{
		GeneratedAppID: app.ID.String(),
		MiniappID:      miniappID,
		Title:          app.Title,
		Description:    app.Description,
		URL:            "/generated-apps/" + app.ID.String(),
		Config:         app.Config,
		Status:         app.Status,
		CreatedAt:      app.CreatedAt,
		UpdatedAt:      app.UpdatedAt,
	}
}

func mapRepoErr(err error) error {
	if errors.Is(err, postgres.ErrNotFound) {
		return ErrNotFound
	}
	return err
}

func categoryForTheme(theme string) string {
	value := strings.ToLower(theme)
	switch {
	case strings.Contains(value, "finance"), strings.Contains(value, "expense"), strings.Contains(value, "budget"):
		return "Finance"
	case strings.Contains(value, "shop"), strings.Contains(value, "store"), strings.Contains(value, "commerce"):
		return "E-commerce"
	case strings.Contains(value, "food"), strings.Contains(value, "delivery"):
		return "Food & Delivery"
	case strings.Contains(value, "education"), strings.Contains(value, "learn"):
		return "Education"
	case strings.Contains(value, "health"), strings.Contains(value, "medical"):
		return "Healthcare"
	case strings.Contains(value, "business"), strings.Contains(value, "productivity"):
		return "Business & Productivity"
	default:
		return "Utilities & Lifestyle"
	}
}

type miniappConfig struct {
	Title       string        `json:"title"`
	Name        string        `json:"name,omitempty"`
	Description string        `json:"description"`
	IconPrompt  string        `json:"icon_prompt"`
	Theme       string        `json:"theme"`
	Pages       []miniappPage `json:"pages"`
}

type miniappPage struct {
	ID         string `json:"id"`
	Title      string `json:"title"`
	Components []any  `json:"components"`
}

type createMiniappRequest struct {
	Title       string `json:"title"`
	Description string `json:"description"`
	URL         string `json:"url"`
	Category    string `json:"category"`
}

type miniappResponse struct {
	ID uuid.UUID `json:"id"`
}
