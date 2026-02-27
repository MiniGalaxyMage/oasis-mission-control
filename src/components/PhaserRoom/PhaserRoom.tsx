import { useEffect, useRef } from 'react'
import Phaser from 'phaser'
import { CommandCenter } from '../../game/CommandCenter'
import type { AgentData } from '../../types'
import './PhaserRoom.css'

interface PhaserRoomProps {
  agents: AgentData[]
}

export function PhaserRoom({ agents }: PhaserRoomProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const gameRef = useRef<Phaser.Game | null>(null)

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return

    gameRef.current = new Phaser.Game({
      type: Phaser.AUTO,
      parent: containerRef.current,
      pixelArt: true,
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: 800,
        height: 600,
      },
      backgroundColor: '#1a1a2e',
      scene: [CommandCenter],
    })

    return () => {
      gameRef.current?.destroy(true)
      gameRef.current = null
    }
  }, [])

  useEffect(() => {
    const scene = gameRef.current?.scene.getScene('CommandCenter') as CommandCenter | null
    if (scene?.updateAgents) {
      scene.updateAgents(agents)
    }
  }, [agents])

  return <div ref={containerRef} className="phaser-room" />
}
