package config

import (
	"os"
	"strconv"
	"time"
)

type Config struct {
	RedisAddr     string
	RedisPassword string
	RedisDB       int

	// URL ke Laravel API untuk fetch daftar router
	LaravelAPIURL   string
	LaravelAPIToken string

	// Interval polling MikroTik (default 5 detik)
	PollInterval time.Duration
}

func Load() *Config {
	pollSec, _ := strconv.Atoi(getEnv("POLL_INTERVAL_SEC", "5"))
	redisDB, _ := strconv.Atoi(getEnv("REDIS_DB", "0"))

	return &Config{
		RedisAddr:       getEnv("REDIS_ADDR", "redis:6379"),
		RedisPassword:   getEnv("REDIS_PASSWORD", ""),
		RedisDB:         redisDB,
		LaravelAPIURL:   getEnv("LARAVEL_API_URL", "http://bangucup-nginx/api"),
		LaravelAPIToken: getEnv("LARAVEL_API_TOKEN", ""),
		PollInterval:    time.Duration(pollSec) * time.Second,
	}
}

func getEnv(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}
