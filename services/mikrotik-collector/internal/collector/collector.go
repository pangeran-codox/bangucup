package collector

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/bangucup/mikrotik-collector/internal/config"
	"github.com/bangucup/mikrotik-collector/internal/mikrotik"
	"github.com/redis/go-redis/v9"
)

const (
	// Redis channel untuk Pub/Sub ke gateway
	channelTraffic = "bangucup:traffic"
	// Redis key prefix untuk status router (TTL 15 detik)
	keyRouterStatus = "bangucup:router:%d:status"
	// Redis key untuk snapshot traffic terakhir per router
	keyRouterTraffic = "bangucup:router:%d:traffic"
)

type Collector struct {
	cfg   *config.Config
	redis *redis.Client
}

func New(cfg *config.Config, rdb *redis.Client) *Collector {
	return &Collector{cfg: cfg, redis: rdb}
}

// Run starts the main poll loop. Blocks until ctx is cancelled.
func (c *Collector) Run(ctx context.Context) {
	log.Printf("[collector] starting, poll interval=%s", c.cfg.PollInterval)

	ticker := time.NewTicker(c.cfg.PollInterval)
	defer ticker.Stop()

	// Poll sekali langsung saat start
	c.pollAll(ctx)

	for {
		select {
		case <-ctx.Done():
			log.Println("[collector] stopped")
			return
		case <-ticker.C:
			c.pollAll(ctx)
		}
	}
}

func (c *Collector) pollAll(ctx context.Context) {
	routers, err := c.fetchRouters()
	if err != nil {
		log.Printf("[collector] fetch routers error: %v", err)
		return
	}

	if len(routers) == 0 {
		return
	}

	var wg sync.WaitGroup
	for _, r := range routers {
		wg.Add(1)
		go func(router mikrotik.Router) {
			defer wg.Done()
			c.collectOne(ctx, router)
		}(r)
	}
	wg.Wait()
}

func (c *Collector) collectOne(ctx context.Context, r mikrotik.Router) {
	snap := mikrotik.Collect(r)

	payload, err := json.Marshal(snap)
	if err != nil {
		log.Printf("[collector] marshal error router %d: %v", r.ID, err)
		return
	}

	pipe := c.redis.Pipeline()

	// Simpan snapshot terakhir (expire 30 detik)
	pipe.Set(ctx,
		fmt.Sprintf(keyRouterTraffic, r.ID),
		payload,
		30*time.Second,
	)

	// Simpan status (expire 15 detik — kalau collector mati, status hilang)
	pipe.Set(ctx,
		fmt.Sprintf(keyRouterStatus, r.ID),
		snap.Status,
		15*time.Second,
	)

	// Publish ke channel supaya gateway broadcast ke browser
	pipe.Publish(ctx, channelTraffic, payload)

	if _, err := pipe.Exec(ctx); err != nil {
		log.Printf("[collector] redis pipeline error router %d: %v", r.ID, err)
	}
}

// laravelRouter adalah struct untuk decode response API Laravel.
type laravelRouter struct {
	ID       int    `json:"id"`
	Name     string `json:"name"`
	Host     string `json:"host"`
	APIPort  int    `json:"api_port"`
	Username string `json:"username"`
	Password string `json:"password"`
	IsActive bool   `json:"is_active"`
}

type laravelResponse struct {
	Data []laravelRouter `json:"data"`
}

func (c *Collector) fetchRouters() ([]mikrotik.Router, error) {
	url := c.cfg.LaravelAPIURL + "/routers"
	req, _ := http.NewRequest(http.MethodGet, url, nil)
	req.Header.Set("Authorization", "Bearer "+c.cfg.LaravelAPIToken)
	req.Header.Set("Accept", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("http get routers: %w", err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)

	var result laravelResponse
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("decode routers: %w", err)
	}

	routers := make([]mikrotik.Router, 0, len(result.Data))
	for _, r := range result.Data {
		if !r.IsActive {
			continue
		}
		port := r.APIPort
		if port == 0 {
			port = 8728
		}
		routers = append(routers, mikrotik.Router{
			ID:       r.ID,
			Name:     r.Name,
			Host:     r.Host,
			APIPort:  port,
			Username: r.Username,
			Password: r.Password,
		})
	}

	return routers, nil
}
