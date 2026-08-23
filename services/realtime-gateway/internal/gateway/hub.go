package gateway

import (
	"context"
	"log"
	"sync"

	"github.com/coder/websocket"
)

// client merepresentasikan satu koneksi WebSocket browser.
type client struct {
	conn   *websocket.Conn
	send   chan []byte
	// filter — set of router IDs yang di-subscribe client ini.
	// Kalau kosong, client menerima semua router.
	filter map[int]bool
	mu     sync.RWMutex
}

func newClient(conn *websocket.Conn) *client {
	return &client{
		conn:   conn,
		send:   make(chan []byte, 64),
		filter: make(map[int]bool),
	}
}

// Hub mengelola semua koneksi aktif dan distribute pesan.
type Hub struct {
	mu      sync.RWMutex
	clients map[*client]struct{}
}

func NewHub() *Hub {
	return &Hub{
		clients: make(map[*client]struct{}),
	}
}

func (h *Hub) register(c *client) {
	h.mu.Lock()
	h.clients[c] = struct{}{}
	h.mu.Unlock()
	log.Printf("[hub] client registered, total=%d", h.count())
}

func (h *Hub) unregister(c *client) {
	h.mu.Lock()
	delete(h.clients, c)
	h.mu.Unlock()
	close(c.send)
	log.Printf("[hub] client unregistered, total=%d", h.count())
}

func (h *Hub) count() int {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return len(h.clients)
}

// Broadcast mengirim payload ke semua client yang relevan.
func (h *Hub) Broadcast(routerID int, payload []byte) {
	h.mu.RLock()
	defer h.mu.RUnlock()

	for c := range h.clients {
		c.mu.RLock()
		subscribed := len(c.filter) == 0 || c.filter[routerID]
		c.mu.RUnlock()

		if !subscribed {
			continue
		}

		select {
		case c.send <- payload:
		default:
			// Buffer penuh — skip
		}
	}
}

// writePump mengambil dari channel send dan kirim ke WebSocket.
func (h *Hub) writePump(ctx context.Context, c *client) {
	defer h.unregister(c)

	for {
		select {
		case <-ctx.Done():
			return
		case msg, ok := <-c.send:
			if !ok {
				return
			}
			if err := c.conn.Write(ctx, websocket.MessageText, msg); err != nil {
				return
			}
		}
	}
}
