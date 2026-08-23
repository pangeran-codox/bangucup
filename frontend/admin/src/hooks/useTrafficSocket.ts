import { useEffect, useRef, useState, useCallback } from 'react'
import { TrafficSocket } from '@/services/websocket/trafficSocket'
import type { RouterSnapshot } from '@/types/realtime'

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected'

interface UseTrafficSocketOptions {
  /** Router IDs yang ingin di-subscribe. Kosong = semua router. */
  routerIds?: number[]
  /** Berapa snapshot terakhir yang disimpan per router (default 60) */
  historySize?: number
}

interface RouterTrafficState {
  latest: RouterSnapshot | null
  history: RouterSnapshot[]
}

export function useTrafficSocket({
  routerIds = [],
  historySize = 60,
}: UseTrafficSocketOptions = {}) {
  const [status, setStatus]   = useState<ConnectionStatus>('disconnected')
  const [data, setData]       = useState<Map<number, RouterTrafficState>>(new Map())
  const socketRef             = useRef<TrafficSocket | null>(null)
  const historyRef            = useRef(historySize)

  historyRef.current = historySize

  const handleSnapshot = useCallback((snap: RouterSnapshot) => {
    setData((prev) => {
      const next = new Map(prev)
      const existing = next.get(snap.router_id)
      const history  = existing ? [...existing.history, snap] : [snap]

      // Keep only last N snapshots
      const trimmed = history.slice(-historyRef.current)

      next.set(snap.router_id, { latest: snap, history: trimmed })
      return next
    })
  }, [])

  useEffect(() => {
    const socket = new TrafficSocket(handleSnapshot, setStatus)
    socketRef.current = socket
    socket.connect()

    return () => {
      socket.disconnect()
    }
  }, [handleSnapshot])

  // Re-subscribe kalau routerIds berubah
  useEffect(() => {
    if (status === 'connected' && socketRef.current) {
      socketRef.current.subscribe(routerIds)
    }
  }, [status, routerIds.join(',')])  // eslint-disable-line react-hooks/exhaustive-deps

  return { status, data }
}
