package config

import (
	"os"
	"strconv"
	"strings"
)

type Config struct {
	// WebSocket server
	ListenAddr string

	// Redis
	RedisAddr     string
	RedisPassword string
	RedisDB       int

	// Origin browser yang boleh membuka WebSocket (pola host, mis. "app.contoh.id" atau "localhost:*").
	// Kosong = hanya same-origin (aman bila di belakang reverse proxy satu domain).
	AllowedOrigins []string

	// Secret bersama dengan Laravel untuk memverifikasi tiket WebSocket (minimal 32 karakter).
	TicketSecret string
}

func Load() *Config {
	redisDB, _ := strconv.Atoi(getEnv("REDIS_DB", "0"))

	return &Config{
		ListenAddr:    getEnv("LISTEN_ADDR", ":8081"),
		RedisAddr:     getEnv("REDIS_ADDR", "redis:6379"),
		RedisPassword: getEnv("REDIS_PASSWORD", ""),
		RedisDB:       redisDB,
		AllowedOrigins: splitList(getEnv("ALLOWED_ORIGIN", "")),
		TicketSecret:   getEnv("WS_TICKET_SECRET", ""),
	}
}

func getEnv(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}

func splitList(v string) []string {
	var out []string
	for _, part := range strings.Split(v, ",") {
		if part = strings.TrimSpace(part); part != "" {
			out = append(out, part)
		}
	}
	return out
}
