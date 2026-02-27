import './Header.css'
import type { SnapshotData } from '../../types'

interface HeaderProps {
  snapshot: SnapshotData | null
}

export function Header({ snapshot }: HeaderProps) {
  const agents = snapshot?.agents ?? []
  const prs = snapshot?.pullRequests ?? []
  const tasks = snapshot?.tasks ?? []
  const activeAgents = agents.filter(a => a.status !== 'idle' && a.status !== 'done').length

  return (
    <header className="app-header">
      <div className="header-title">
        <span className="header-icon">🎮</span>
        <span>OASIS MISSION CONTROL</span>
      </div>
      <div className="header-stats">
        <span className="stat-badge">
          <span className="stat-icon">🤖</span>
          Agentes: <strong>{activeAgents}/{agents.length}</strong>
        </span>
        <span className="stat-badge">
          <span className="stat-icon">🔀</span>
          PRs: <strong>{prs.length}</strong>
        </span>
        <span className="stat-badge">
          <span className="stat-icon">📋</span>
          Tareas: <strong>{tasks.length}</strong>
        </span>
        {snapshot?.heartbeat && (
          <span className={`stat-badge heartbeat-${snapshot.heartbeat.status}`}>
            <span className="stat-icon">💎</span>
            {snapshot.heartbeat.status.toUpperCase()}
          </span>
        )}
      </div>
    </header>
  )
}
