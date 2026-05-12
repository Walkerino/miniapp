package pkg

import "time"

type UserContext struct {
	ID    string
	Email string
	Name  *string
	Role  string
}

type CreateMiniappRequest struct {
	Title       string  `json:"title"`
	Description *string `json:"description"`
	URL         string  `json:"url"`
	Category    string  `json:"category"`
}

type AdminCreateMiniappRequest struct {
	Title       string  `json:"title"`
	Description *string `json:"description"`
	URL         string  `json:"url"`
	Category    string  `json:"category"`
	Status      string  `json:"status"`
}

type UpdateMiniappRequest struct {
	Title       *string `json:"title"`
	Description *string `json:"description"`
	URL         *string `json:"url"`
	Category    *string `json:"category"`
	Status      *string `json:"status"`
}

type MiniappResponse struct {
	ID            string    `json:"id"`
	Title         string    `json:"title"`
	Description   *string   `json:"description"`
	URL           string    `json:"url"`
	Category      string    `json:"category"`
	Status        string    `json:"status"`
	RejectReason  *string   `json:"reject_reason"`
	CreatedBy     string    `json:"created_by"`
	UpdatedBy     *string   `json:"updated_by"`
	LaunchesCount int       `json:"launches_count"`
	IsFavorite    bool      `json:"is_favorite"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

type MiniappListResponse struct {
	Items []MiniappResponse `json:"items"`
	Page  int               `json:"page"`
	Limit int               `json:"limit"`
	Total int               `json:"total"`
}

type AdminMetricsResponse struct {
	TotalMiniapps    int `json:"total_miniapps"`
	ActiveMiniapps   int `json:"active_miniapps"`
	PendingMiniapps  int `json:"pending_miniapps"`
	RejectedMiniapps int `json:"rejected_miniapps"`
	TotalLaunches    int `json:"total_launches"`
	LaunchesToday    int `json:"launches_today"`
	LaunchesThisWeek int `json:"launches_this_week"`
}

type LaunchMiniappResponse struct {
	LaunchURL   string    `json:"launch_url"`
	LaunchToken string    `json:"launch_token"`
	ExpiresAt   time.Time `json:"expires_at"`
}

type FavoriteResponse struct {
	UserID    string    `json:"user_id"`
	MiniappID string    `json:"miniapp_id"`
	CreatedAt time.Time `json:"created_at"`
}

type MiniappSessionContext struct {
	User      MiniappSessionUser `json:"user"`
	Miniapp   MiniappSessionApp  `json:"miniapp"`
	ExpiresAt time.Time          `json:"expires_at"`
}

type MiniappSessionUser struct {
	ID    string  `json:"id"`
	Email string  `json:"email"`
	Name  *string `json:"name"`
	Role  string  `json:"role"`
}

type MiniappSessionApp struct {
	ID    string `json:"id"`
	Title string `json:"title"`
}

type ErrorResponse struct {
	Error   string `json:"error"`
	Message string `json:"message"`
}
