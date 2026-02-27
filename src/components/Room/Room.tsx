import './Room.css'
import type { AgentData } from '../../types'
import { Agent } from '../Agent/Agent'

interface RoomProps {
  agents: AgentData[]
}

// Waypoints para cada agente dentro de la sala (porcentajes)
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

const SPRITE_MAP: Record<string, string> = {
  percival: '/assets/sprites/percival-static.png',
  forge: '/assets/sprites/forge-static.png',
  sprite: '/assets/sprites/sprite-static.png',
}

function getSpriteUrl(agentId: string): string {
  const key = agentId.toLowerCase()
  for (const [name, url] of Object.entries(SPRITE_MAP)) {
    if (key.includes(name)) return url
  }
  return '/assets/sprites/sprite-static.png'
}

function getWaypoints(agentId: string) {
  const key = agentId.toLowerCase()
  for (const [name, wps] of Object.entries(AGENT_WAYPOINTS)) {
    if (key.includes(name)) return wps
  }
  // Waypoints genéricos si no hay match
  return [
    { x: 40 + Math.random() * 20, y: 40 + Math.random() * 20 },
    { x: 50 + Math.random() * 20, y: 50 + Math.random() * 20 },
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
            spriteUrl={getSpriteUrl(agent.id)}
            waypoints={getWaypoints(agent.id)}
          />
        ))}
      </div>
    </div>
  )
}
