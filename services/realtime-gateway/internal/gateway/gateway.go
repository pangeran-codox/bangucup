package gateway

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"time"

	"github.com/bangucup/realtime-gateway/internal/config"
	"github.com/bangucup/realtime-gateway/internal/ticket"
	"github.com/coder/websocket"
	"github.com/coder/websocket/wsjson"
	"github.com/redis/go-redis/v9"
)

const channelTraffic = "bangucup:traffic"

// trafficPayload digunakan untuk membaca router_id dari pesan Redis.
type trafficPayload struct {
	RouterID int `json:"router_id"`
}

// clientMsg adalah pesan dari browser ke gateway.
type clientMsg struct {
	Type      string `json:"type"`       // "subscribe" | "unsubscribe"
	RouterIDs []int  `json:"router_ids"` // kosong = semua
}

type Gateway struct {
	cfg   *config.Config
	rdb   *redis.Client
	hub   *Hub
}

func New(cfg *config.Config, rdb *redis.Client) *Gateway {
	return &Gateway{
		cfg: cfg,
		rdb: rdb,
		hub: NewHub(),
	}
}

// StartRedisSubscriber mulai subscribe ke Redis Pub/Sub dan broadcast ke hub.
func (g *Gateway) StartRedisSubscriber(ctx context.Context) {
	sub := g.rdb.Subscribe(ctx, channelTraffic)
	ch  := sub.Channel()

	log.Printf("[gateway] subscribed to Redis channel: %s", channelTraffic)

	go func() {
		defer sub.Close()
		for {
			select {
			case <-ctx.Done():
				return
			case msg, ok := <-ch:
				if !ok {
					return
				}

				// Decode hanya untuk dapat router_id
				var p trafficPayload
				if err := json.Unmarshal([]byte(msg.Payload), &p); err != nil {
					continue
				}

				g.hub.Broadcast(p.RouterID, []byte(msg.Payload))
			}
		}
	}()
}

// ServeHTTP handles WebSocket upgrade requests.
func (g *Gateway) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// 1. Autentikasi: tiket bertanda tangan dari Laravel (POST /api/realtime/ticket).
	claims, err := ticket.Verify(r.URL.Query().Get("ticket"), g.cfg.TicketSecret, time.Now())
	if err != nil {
		log.Printf("[gateway] koneksi ditolak: %v", err)
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	// 2. Tiket hanya boleh dipakai sekali: tandai jti di Redis selama 2 menit.
	fresh, err := g.rdb.SetNX(r.Context(), "bangucup:ws-jti:"+claims.JTI, 1, 2*time.Minute).Result()
	if err != nil {
		log.Printf("[gateway] redis error saat cek jti: %v", err)
		http.Error(w, "service unavailable", http.StatusServiceUnavailable)
		return
	}
	if !fresh {
		log.Printf("[gateway] koneksi ditolak: tiket sudah dipakai (user %d)", claims.UserID)
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	conn, err := websocket.Accept(w, r, &websocket.AcceptOptions{
		OriginPatterns: g.cfg.AllowedOrigins,
	})
	if err != nil {
		log.Printf("[gateway] accept error: %v", err)
		return
	}
	defer conn.CloseNow()
	conn.SetReadLimit(4096) // pesan dari browser hanya subscribe/unsubscribe kecil

	c := newClient(conn)
	g.hub.register(c)

	ctx, cancel := context.WithCancel(r.Context())
	defer cancel()

	// Write pump — goroutine terpisah
	go g.hub.writePump(ctx, c)

	// Read pump — baca pesan subscribe/unsubscribe dari browser
	for {
		var msg clientMsg
		if err := wsjson.Read(ctx, conn, &msg); err != nil {
			break
		}
		g.handleClientMessage(c, msg)
	}
}

func (g *Gateway) handleClientMessage(c *client, msg clientMsg) {
	c.mu.Lock()
	defer c.mu.Unlock()

	switch msg.Type {
	case "subscribe":
		// Reset filter dan set yang baru
		c.filter = make(map[int]bool)
		for _, id := range msg.RouterIDs {
			c.filter[id] = true
		}
		log.Printf("[gateway] client subscribed to routers: %v", msg.RouterIDs)

	case "unsubscribe":
		c.filter = make(map[int]bool) // subscribe semua
	}
}

// HealthHandler untuk health check.
func HealthHandler(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"status":"ok"}`))
}
