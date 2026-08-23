package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/bangucup/realtime-gateway/internal/config"
	"github.com/bangucup/realtime-gateway/internal/gateway"
	"github.com/redis/go-redis/v9"
)

func main() {
	log.SetFlags(log.LstdFlags | log.Lshortfile)
	log.Println("[main] bangucup realtime-gateway starting")

	cfg := config.Load()

	rdb := redis.NewClient(&redis.Options{
		Addr:     cfg.RedisAddr,
		Password: cfg.RedisPassword,
		DB:       cfg.RedisDB,
	})

	ctx, cancel := context.WithCancel(context.Background())

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	go func() {
		<-quit
		log.Println("[main] shutdown signal received")
		cancel()
	}()

	if err := rdb.Ping(ctx).Err(); err != nil {
		log.Fatalf("[main] redis ping failed: %v", err)
	}
	log.Printf("[main] redis connected: %s", cfg.RedisAddr)

	gw := gateway.New(cfg, rdb)
	gw.StartRedisSubscriber(ctx)

	mux := http.NewServeMux()
	mux.HandleFunc("/ws",    gw.ServeHTTP)
	mux.HandleFunc("/healthz", gateway.HealthHandler)

	srv := &http.Server{
		Addr:    cfg.ListenAddr,
		Handler: mux,
	}

	go func() {
		log.Printf("[main] listening on %s", cfg.ListenAddr)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("[main] server error: %v", err)
		}
	}()

	<-ctx.Done()

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer shutdownCancel()
	srv.Shutdown(shutdownCtx)
	log.Println("[main] exited")
}
