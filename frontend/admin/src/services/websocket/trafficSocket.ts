import { apiClient } from '@/services/api/client'
import type { RouterSnapshot, WsSubscribeMsg } from '@/types/realtime'

type SnapshotHandler = (snapshot: RouterSnapshot) => void
type StatusHandler = (status: 'connecting' | 'connected' | 'disconnected') => void

const WS_URL = import.meta.env.VITE_WS_URL ?? 'ws://localhost:8081/ws'

export class TrafficSocket {
  private ws: WebSocket | null = null
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private destroyed = false
  private reconnectDelay = 2000
  private connecting = false

  private onSnapshot: SnapshotHandler
  private onStatus: StatusHandler

  constructor(onSnapshot: SnapshotHandler, onStatus: StatusHandler) {
    this.onSnapshot = onSnapshot
    this.onStatus   = onStatus
  }

  async connect() {
    if (this.destroyed || this.connecting) return
    if (this.ws?.readyState === WebSocket.OPEN) return

    this.connecting = true
    this.onStatus('connecting')

    // Gateway hanya menerima koneksi dengan tiket sekali-pakai dari Laravel (berlaku 60 detik),
    // jadi setiap (re)connect harus meminta tiket baru.
    let ticket: string
    try {
      const res = await apiClient.post<{ data: { ticket: string } }>('/realtime/ticket')
      ticket = res.data.data.ticket
    } catch {
      this.connecting = false
      if (!this.destroyed) {
        this.onStatus('disconnected')
        this.scheduleReconnect()
      }
      return
    }
    this.connecting = false
    if (this.destroyed) return

    const sep = WS_URL.includes('?') ? '&' : '?'
    this.ws = new WebSocket(`${WS_URL}${sep}ticket=${encodeURIComponent(ticket)}`)

    this.ws.onopen = () => {
      this.reconnectDelay = 2000
      this.onStatus('connected')
    }

    this.ws.onmessage = (event) => {
      try {
        const snap = JSON.parse(event.data) as RouterSnapshot
        this.onSnapshot(snap)
      } catch {
        // ignore malformed messages
      }
    }

    this.ws.onclose = () => {
      if (this.destroyed) return
      this.onStatus('disconnected')
      this.scheduleReconnect()
    }

    this.ws.onerror = () => {
      this.ws?.close()
    }
  }

  subscribe(routerIds: number[]) {
    const msg: WsSubscribeMsg = {
      type: 'subscribe',
      router_ids: routerIds,
    }
    this.send(msg)
  }

  unsubscribeAll() {
    this.send({ type: 'unsubscribe', router_ids: [] })
  }

  disconnect() {
    this.destroyed = true
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
    this.ws?.close()
  }

  private send(msg: WsSubscribeMsg) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg))
    }
  }

  private scheduleReconnect() {
    this.reconnectTimer = setTimeout(() => {
      this.reconnectDelay = Math.min(this.reconnectDelay * 1.5, 30_000)
      void this.connect()
    }, this.reconnectDelay)
  }
}
