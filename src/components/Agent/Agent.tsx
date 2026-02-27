import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import './Agent.css'
import type { AgentData } from '../../types'

interface Waypoint {
  x: number
  y: number
}

interface AgentProps {
  data: AgentData
  spriteUrl: string
  waypoints: Waypoint[]
}

const STATUS_ICONS: Record<AgentData['status'], string> = {
  idle: '💤',
  working: '⚡',
  thinking: '🤔',
  orchestrating: '🎯',
  error: '❌',
  done: '✅',
}

const STATUS_COLORS: Record<AgentData['status'], string> = {
  idle: '#888',
  working: '#ffd700',
  thinking: '#00bcd4',
  orchestrating: '#e040fb',
  error: '#f44336',
  done: '#4caf50',
}

function randomPause(min: number, max: number): number {
  return (min + Math.random() * (max - min)) * 1000
}

export function Agent({ data, spriteUrl, waypoints }: AgentProps) {
  const [waypointIndex, setWaypointIndex] = useState(0)
  const [showTooltip, setShowTooltip] = useState(false)

  const currentWaypoint = waypoints[waypointIndex]

  useEffect(() => {
    // Si el agente está working, se queda en su puesto (primer waypoint)
    if (data.status === 'working' || data.status === 'done') return

    const scheduleNext = () => {
      const pause = randomPause(4, 7)
      const timer = setTimeout(() => {
        setWaypointIndex(prev => {
          const next = (prev + 1) % waypoints.length
          return next
        })
        scheduleNext()
      }, pause)
      return timer
    }

    const timer = scheduleNext()
    return () => clearTimeout(timer)
  }, [data.status, waypoints.length])

  return (
    <motion.div
      className="agent"
      animate={{
        left: `${currentWaypoint.x}%`,
        top: `${currentWaypoint.y}%`,
      }}
      transition={{ duration: 3, ease: 'easeInOut' }}
      style={{ position: 'absolute' }}
      onHoverStart={() => setShowTooltip(true)}
      onHoverEnd={() => setShowTooltip(false)}
      onClick={() => setShowTooltip(prev => !prev)}
    >
      {/* Status glow */}
      <div
        className="agent-glow"
        style={{ background: STATUS_COLORS[data.status] }}
      />

      {/* Sprite */}
      <img
        src={spriteUrl}
        alt={data.name}
        className="agent-sprite"
        draggable={false}
      />

      {/* Nombre + icono */}
      <div className="agent-label" style={{ color: STATUS_COLORS[data.status] }}>
        {STATUS_ICONS[data.status]} {data.name}
      </div>

      {/* Tooltip */}
      <AnimatePresence>
        {showTooltip && (
          <motion.div
            className="agent-tooltip nes-container is-dark"
            initial={{ opacity: 0, y: 8, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.9 }}
            transition={{ duration: 0.15 }}
          >
            <div className="tooltip-name">{data.name}</div>
            <div className="tooltip-row">
              <span>Estado:</span>
              <span style={{ color: STATUS_COLORS[data.status] }}>
                {STATUS_ICONS[data.status]} {data.status}
              </span>
            </div>
            <div className="tooltip-row">
              <span>Modelo:</span>
              <span>{data.model}</span>
            </div>
            {data.currentTask && (
              <div className="tooltip-row">
                <span>Tarea:</span>
                <span className="tooltip-task">{data.currentTask}</span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
