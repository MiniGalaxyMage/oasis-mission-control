import './Room.css'
import type { AgentData } from '../../types'
import { Agent } from '../Agent/Agent'

interface RoomProps {
  agents: AgentData[]
}

// Configuración de spritesheets por agente
const SPRITE_CONFIG = {
  percival: {
    idle: { sheet: '/assets/sprites/percival-idle-sheet.png', frames: 4, frameWidth: 69, height: 96 },
    typing: { sheet: '/assets/sprites/percival-typing-sheet.png', frames: 3, frameWidth: 128, height: 115 },
    static: '/assets/sprites/percival-static.png',
  },
  forge: {
    idle: { sheet: '/assets/sprites/forge-idle-sheet.png', frames: 4, frameWidth: 99, height: 96 },
    typing: { sheet: '/assets/sprites/forge-typing-sheet.png', frames: 4, frameWidth: 121, height: 115 },
    static: '/assets/sprites/forge-static.png',
  },
  sprite: {
    idle: { sheet: '/assets/sprites/sprite-idle-sheet.png', frames: 4, frameWidth: 107, height: 96 },
    typing: { sheet: '/assets/sprites/sprite-typing-sheet.png', frames: 4, frameWidth: 158, height: 115 },
    static: '/assets/sprites/sprite-static.png',
  },
} as const

// Posición fija en el escritorio de cada agente (cuando trabaja)
const DESK_POSITIONS: Record<string, { x: number; y: number }> = {
  percival: { x: 22, y: 52 }, // escritorio del comandante, centro-izquierda
  forge:    { x: 48, y: 55 }, // workstation principal, centro
  sprite:   { x: 74, y: 52 }, // estación de arte, centro-derecha
}

// Waypoints para deambular cuando están idle
const AGENT_WAYPOINTS: Record<string, Array<{ x: number; y: number }>> = {
  percival: [
    { x: 15, y: 40 },
    { x: 25, y: 60 },
    { x: 20, y: 30 },
    { x: 30, y: 55 },
  ],
  forge: [
    { x: 45, y: 45 },
    { x: 55, y: 60 },
    { x: 50, y: 35 },
    { x: 60, y: 50 },
  ],
  sprite: [
    { x: 70, y: 40 },
    { x: 75, y: 60 },
    { x: 65, y: 50 },
    { x: 80, y: 45 },
  ],
}

type SpriteKey = keyof typeof SPRITE_CONFIG

function getAgentKey(agentId: string): SpriteKey {
  const id = agentId.toLowerCase()
  for (const key of Object.keys(SPRITE_CONFIG) as SpriteKey[]) {
    if (id.includes(key)) return key
  }
  return 'sprite'
}

function getSpriteConfig(agentId: string) {
  return SPRITE_CONFIG[getAgentKey(agentId)]
}

function getDeskPosition(agentId: string) {
  const key = agentId.toLowerCase()
  for (const [name, pos] of Object.entries(DESK_POSITIONS)) {
    if (key.includes(name)) return pos
  }
  return { x: 50, y: 50 }
}

function getWaypoints(agentId: string) {
  const key = agentId.toLowerCase()
  for (const [name, wps] of Object.entries(AGENT_WAYPOINTS)) {
    if (key.includes(name)) return wps
  }
  return [
    { x: 40, y: 40 },
    { x: 55, y: 55 },
  ]
}

export function Room({ agents }: RoomProps) {
  // Si no hay datos aún, mostrar agentes demo
  const displayAgents = agents.length > 0 ? agents : [
    { id: 'percival', name: 'Percival', status: 'idle' as const, currentTask: null, model: 'claude-opus-4' },
    { id: 'forge', name: 'Forge', status: 'working' as const, currentTask: 'react-migration', model: 'claude-sonnet-4' },
    { id: 'sprite', name: 'Sprite', status: 'thinking' as const, currentTask: null, model: 'gpt-4o' },
  ]

  return (
    <div className="room-wrapper">
      <div
        className="room"
        style={{
          backgroundImage: 'url(/assets/room/castle-room-bg.png)',
        }}
      >
        {displayAgents.map(agent => (
          <Agent
            key={agent.id}
            data={agent}
            spriteConfig={getSpriteConfig(agent.id)}
            waypoints={getWaypoints(agent.id)}
            deskPosition={getDeskPosition(agent.id)}
          />
        ))}
      </div>
    </div>
  )
}
