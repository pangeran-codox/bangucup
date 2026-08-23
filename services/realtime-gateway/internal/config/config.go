package config

import (
	"os"
	"strconv"
)

type Config struct {
	// WebSocket server
	ListenAddr string

	// Redis
	RedisAddr     string
	RedisPassword string
	RedisDB       int

	// CORS — origin frontend React
	AllowedOrigin string
}

func Load() *Config {
	redisDB, _ := strconv.Atoi(getEnv("REDIS_DB", "0"))

	return &Config{
		ListenAddr:    getEnv("LISTEN_ADDR", ":8081"),
		RedisAddr:     getEnv("REDIS_ADDR", "redis:6379"),
		RedisPassword: getEnv("REDIS_PASSWORD", ""),
		RedisDB:       redisDB,
		AllowedOrigin: getEnv("ALLOWED_ORIGIN", "*"),
	}
}

func getEnv(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}
