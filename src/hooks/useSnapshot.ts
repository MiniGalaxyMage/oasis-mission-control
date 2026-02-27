import { useState, useEffect } from 'react'
import type { SnapshotData } from '../types'

export function useSnapshot(interval = 30000): SnapshotData | null {
  const [snapshot, setSnapshot] = useState<SnapshotData | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/data/snapshot.json?t=' + Date.now())
        if (res.ok) {
          const data: SnapshotData = await res.json()
          setSnapshot(data)
        }
      } catch (err) {
        console.error('[useSnapshot] Error cargando snapshot:', err)
      }
    }

    load()
    const timer = setInterval(load, interval)
    return () => clearInterval(timer)
  }, [interval])

  return snapshot
}
