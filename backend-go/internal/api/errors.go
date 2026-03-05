package api

import (
	"encoding/json"
	"net/http"
	"time"
)

type ErrorResponse struct {
	Timestamp time.Time `json:"timestamp"`
	Status    int       `json:"status"`
	Error     string    `json:"error"`
	Message   string    `json:"message"`
	Path      string    `json:"path"`
	Details   []string  `json:"details"`
}

func WriteJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func WriteError(w http.ResponseWriter, r *http.Request, status int, message string, details ...string) {
	resp := ErrorResponse{
		Timestamp: time.Now().UTC(),
		Status:    status,
		Error:     http.StatusText(status),
		Message:   message,
		Path:      r.URL.Path,
		Details:   normalizeDetails(details),
	}
	WriteJSON(w, status, resp)
}

func normalizeDetails(details []string) []string {
	if len(details) == 0 {
		return []string{}
	}
	out := make([]string, 0, len(details))
	for _, detail := range details {
		if detail == "" {
			continue
		}
		out = append(out, detail)
	}
	if len(out) == 0 {
		return []string{}
	}
	return out
}
