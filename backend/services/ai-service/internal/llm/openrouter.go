package llm

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net"
	"net/http"
	"strings"
	"time"
)

const systemPrompt = "You generate JSON configs for miniapps. Return only valid JSON. No markdown. No explanations."

var ErrTimeout = errors.New("llm request timed out")

type Client struct {
	baseURL     string
	apiKey      string
	model       string
	maxTokens   int
	temperature float64
	httpClient  *http.Client
}

func NewClient(baseURL, apiKey, model string, timeout time.Duration, maxTokens int, temperature float64) *Client {
	return &Client{
		baseURL:     strings.TrimRight(baseURL, "/"),
		apiKey:      apiKey,
		model:       model,
		maxTokens:   maxTokens,
		temperature: temperature,
		httpClient:  &http.Client{Timeout: timeout},
	}
}

func (c *Client) GenerateConfig(ctx context.Context, prompt string) (json.RawMessage, error) {
	body := completionRequest{
		Model: c.model,
		Messages: []message{
			{Role: "system", Content: systemPrompt},
			{Role: "user", Content: buildUserPrompt(prompt)},
		},
		Temperature: c.temperature,
		MaxTokens:   c.maxTokens,
	}

	payload, err := json.Marshal(body)
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+"/chat/completions", bytes.NewReader(payload))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+c.apiKey)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("HTTP-Referer", "http://localhost:8080")
	req.Header.Set("X-Title", "Miniapp Platform")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		if errors.Is(err, context.DeadlineExceeded) {
			return nil, ErrTimeout
		}
		var netErr net.Error
		if errors.As(err, &netErr) && netErr.Timeout() {
			return nil, ErrTimeout
		}
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("llm request failed with status %d", resp.StatusCode)
	}

	var completion completionResponse
	if err := json.NewDecoder(resp.Body).Decode(&completion); err != nil {
		return nil, err
	}
	if len(completion.Choices) == 0 {
		return nil, errors.New("llm response has no choices")
	}

	content := strings.TrimSpace(completion.Choices[0].Message.Content)
	if content == "" {
		return nil, errors.New("llm response content is empty")
	}

	content = cleanJSONContent(content)
	var config json.RawMessage
	if err := json.Unmarshal([]byte(content), &config); err != nil {
		return nil, fmt.Errorf("llm returned invalid json: %w", err)
	}
	return config, nil
}

func buildUserPrompt(prompt string) string {
	return strings.TrimSpace(prompt) + `

Return a single JSON object with exactly this shape:
{
  "title": "short English app title",
  "description": "one sentence description",
  "icon_prompt": "short icon generation prompt",
  "theme": "Finance | E-commerce | Food & Delivery | Transport & Travel | Government & Public Services | Education | Healthcare | Entertainment & Media | Business & Productivity | Utilities & Lifestyle",
  "pages": [
    {
      "id": "main",
      "title": "Main",
      "components": [
        {
          "type": "text | input | select | button | list",
          "name": "optional_machine_name",
          "label": "optional label",
          "value": "optional value",
          "input_type": "text | number | date",
          "options": ["optional option"],
          "action": "add_item | delete_item | clear_items",
          "target": "optional target",
          "source": "optional source"
        }
      ]
    }
  ]
}

Rules:
- Top-level title, description and pages are required.
- pages must contain at least one page.
- components must contain at least one component.
- Return JSON only.`
}

func cleanJSONContent(content string) string {
	content = strings.TrimSpace(content)
	if strings.HasPrefix(content, "```") {
		content = strings.TrimPrefix(content, "```json")
		content = strings.TrimPrefix(content, "```")
		content = strings.TrimSuffix(content, "```")
		content = strings.TrimSpace(content)
	}
	if strings.HasPrefix(content, "{") && strings.HasSuffix(content, "}") {
		return content
	}
	start := strings.Index(content, "{")
	end := strings.LastIndex(content, "}")
	if start >= 0 && end > start {
		return strings.TrimSpace(content[start : end+1])
	}
	return content
}

type completionRequest struct {
	Model       string    `json:"model"`
	Messages    []message `json:"messages"`
	Temperature float64   `json:"temperature"`
	MaxTokens   int       `json:"max_tokens"`
}

type message struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type completionResponse struct {
	Choices []struct {
		Message message `json:"message"`
	} `json:"choices"`
}
