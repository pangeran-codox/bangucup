package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"syscall"

	"github.com/bangucup/mikrotik-collector/internal/collector"
	"github.com/bangucup/mikrotik-collector/internal/config"
	"github.com/redis/go-redis/v9"
)

func main() {
	log.SetFlags(log.LstdFlags | log.Lshortfile)
	log.Println("[main] bangucup mikrotik-collector starting")

	cfg := config.Load()

	rdb := redis.NewClient(&redis.Options{
		Addr:     cfg.RedisAddr,
		Password: cfg.RedisPassword,
		DB:       cfg.RedisDB,
	})

	ctx, cancel := context.WithCancel(context.Background())

	// Graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	go func() {
		<-quit
		log.Println("[main] shutdown signal received")
		cancel()
	}()

	// Ping Redis
	if err := rdb.Ping(ctx).Err(); err != nil {
		log.Fatalf("[main] redis ping failed: %v", err)
	}
	log.Printf("[main] redis connected: %s", cfg.RedisAddr)

	c := collector.New(cfg, rdb)
	c.Run(ctx)

	log.Println("[main] exited")
}
