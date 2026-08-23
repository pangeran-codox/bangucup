import ReactECharts from 'echarts-for-react'
import { useMemo } from 'react'
import type { RouterSnapshot } from '@/types/realtime'
import { formatBps } from '@/lib/utils'

interface TrafficChartProps {
  history: RouterSnapshot[]
  interfaceName: string
  height?: number
}

export function TrafficChart({ history, interfaceName, height = 200 }: TrafficChartProps) {
  const option = useMemo(() => {
    const times  = history.map((s) => new Date(s.timestamp).toLocaleTimeString('id-ID'))
    const rxData = history.map((s) => {
      const iface = s.interfaces.find((i) => i.name === interfaceName)
      return iface ? Math.round(iface.rx_bps / 1000) : 0 // kbps
    })
    const txData = history.map((s) => {
      const iface = s.interfaces.find((i) => i.name === interfaceName)
      return iface ? Math.round(iface.tx_bps / 1000) : 0
    })

    return {
      backgroundColor: 'transparent',
      grid: { top: 10, right: 10, bottom: 30, left: 50 },
      tooltip: {
        trigger: 'axis',
        formatter: (params: { seriesName: string; value: number }[]) => {
          return params
            .map((p) => `${p.seriesName}: ${formatBps(p.value * 1000)}`)
            .join('<br/>')
        },
      },
      xAxis: {
        type: 'category',
        data: times,
        axisLabel: { fontSize: 10, color: '#94a3b8' },
        axisLine: { lineStyle: { color: '#334155' } },
        splitLine: { show: false },
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          fontSize: 10,
          color: '#94a3b8',
          formatter: (v: number) => `${v}K`,
        },
        axisLine: { show: false },
        splitLine: { lineStyle: { color: '#1e293b' } },
      },
      series: [
        {
          name: 'RX',
          type: 'line',
          data: rxData,
          smooth: true,
          symbol: 'none',
          lineStyle: { color: '#22c55e', width: 2 },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(34,197,94,0.3)' },
                { offset: 1, color: 'rgba(34,197,94,0)' },
              ],
            },
          },
        },
        {
          name: 'TX',
          type: 'line',
          data: txData,
          smooth: true,
          symbol: 'none',
          lineStyle: { color: '#3b82f6', width: 2 },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(59,130,246,0.3)' },
                { offset: 1, color: 'rgba(59,130,246,0)' },
              ],
            },
          },
        },
      ],
    }
  }, [history, interfaceName])

  return (
    <ReactECharts
      option={option}
      style={{ height }}
      opts={{ renderer: 'canvas' }}
    />
  )
}
