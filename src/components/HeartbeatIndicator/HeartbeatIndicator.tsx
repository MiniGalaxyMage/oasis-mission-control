import './HeartbeatIndicator.css'
import type { HeartbeatData } from '../../types'

interface HeartbeatIndicatorProps {
  heartbeat: HeartbeatData | null
}

const STATUS_CONFIG = {
  ok: { icon: '💎', color: '#4caf50', label: 'OPERATIVO' },
  warn: { icon: '⚠️', color: '#ff9800', label: 'ATENCIÓN' },
  error: { icon: '💀', color: '#f44336', label: 'ERROR' },
}

export function HeartbeatIndicator({ heartbeat }: HeartbeatIndicatorProps) {
  if (!heartbeat) {
    return (
      <div className="nes-container is-dark with-title heartbeat-container">
        <p className="title">💎 Heartbeat</p>
        <div className="heartbeat-unknown">⏳ Cargando...</div>
      </div>
    )
  }

  const config = STATUS_CONFIG[heartbeat.status]
  const lastCheck = new Date(heartbeat.lastCheck).toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })

  return (
    <div className="nes-container is-dark with-title heartbeat-container">
      <p className="title">💎 Heartbeat</p>
      <div className="heartbeat-content">
        <span
          className={`heartbeat-icon heartbeat-${heartbeat.status}`}
          style={{ color: config.color }}
        >
          {config.icon}
        </span>
        <div className="heartbeat-info">
          <span className="heartbeat-label" style={{ color: config.color }}>
            {config.label}
          </span>
          <span className="heartbeat-time">Último: {lastCheck}</span>
        </div>
      </div>
    </div>
  )
}
