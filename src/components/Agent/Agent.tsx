import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import './Agent.css'
import type { AgentData } from '../../types'

interface Waypoint {
  x: number
  y: number
}

interface SpriteAnimConfig {
  sheet: string
  frames: number
  frameWidth: number
  height: number
}

interface SpriteConfig {
  idle: SpriteAnimConfig
  typing: SpriteAnimConfig
  static: string
}

interface AgentProps {
  data: AgentData
  spriteConfig: SpriteConfig
  waypoints: Waypoint[]
  deskPosition: Waypoint
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

type AnimMode = 'idle' | 'typing' | 'static'

function getAnimMode(status: AgentData['status']): AnimMode {
  if (status === 'idle' || status === 'thinking') return 'idle'
  if (status === 'working' || status === 'orchestrating') return 'typing'
  return 'static'
}

function randomPause(min: number, max: number): number {
  return (min + Math.random() * (max - min)) * 1000
}

export function Agent({ data, spriteConfig, waypoints, deskPosition }: AgentProps) {
  const [waypointIndex, setWaypointIndex] = useState(0)
  const [showTooltip, setShowTooltip] = useState(false)
  const [frame, setFrame] = useState(0)

  const animMode = getAnimMode(data.status)
  const isWorking = data.status === 'working' || data.status === 'orchestrating'

  // Posición actual: desk cuando trabaja, waypoint cuando pasea
  const currentPosition = isWorking ? deskPosition : waypoints[waypointIndex]

  // Animación de frames del spritesheet
  useEffect(() => {
    setFrame(0)
    if (animMode === 'static') return

    const config = animMode === 'idle' ? spriteConfig.idle : spriteConfig.typing
    const interval = animMode === 'idle' ? 400 : 300

    const timer = setInterval(() => {
      setFrame(prev => (prev + 1) % config.frames)
    }, interval)

    return () => clearInterval(timer)
  }, [animMode, spriteConfig])

  // Movimiento entre waypoints cuando está idle/thinking
  useEffect(() => {
    if (isWorking || data.status === 'done' || data.status === 'error') return

    const scheduleNext = () => {
      const pause = randomPause(4, 7)
      const timer = setTimeout(() => {
        setWaypointIndex(prev => (prev + 1) % waypoints.length)
        scheduleNext()
      }, pause)
      return timer
    }

    const timer = scheduleNext()
    return () => clearTimeout(timer)
  }, [data.status, waypoints.length, isWorking])

  // Calcular background-position para el sprite
  const currentConfig = animMode === 'idle'
    ? spriteConfig.idle
    : animMode === 'typing'
    ? spriteConfig.typing
    : null

  const spriteStyle: React.CSSProperties = currentConfig
    ? {
        backgroundImage: `url(${currentConfig.sheet})`,
        backgroundPosition: `-${frame * currentConfig.frameWidth}px 0px`,
        backgroundRepeat: 'no-repeat',
        backgroundSize: 'auto 100%',
        width: `${currentConfig.frameWidth}px`,
        height: `${currentConfig.height}px`,
        imageRendering: 'pixelated',
      }
    : {
        backgroundImage: `url(${spriteConfig.static})`,
        backgroundPosition: '0px 0px',
        backgroundRepeat: 'no-repeat',
        backgroundSize: 'contain',
        width: '69px',
        height: '96px',
        imageRendering: 'pixelated',
      }

  return (
    <motion.div
      className={`agent agent--${animMode}`}
      animate={{
        left: `${currentPosition.x}%`,
        top: `${currentPosition.y}%`,
      }}
      transition={{ duration: isWorking ? 0.8 : 3, ease: 'easeInOut' }}
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

      {/* Sprite animado */}
      <div
        className="agent-sprite"
        style={spriteStyle}
        role="img"
        aria-label={data.name}
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
