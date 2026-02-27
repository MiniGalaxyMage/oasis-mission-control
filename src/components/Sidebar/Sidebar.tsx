import './Sidebar.css'
import type { SnapshotData } from '../../types'
import { TaskBoard } from '../TaskBoard/TaskBoard'
import { PRList } from '../PRList/PRList'
import { HeartbeatIndicator } from '../HeartbeatIndicator/HeartbeatIndicator'

interface SidebarProps {
  snapshot: SnapshotData | null
}

export function Sidebar({ snapshot }: SidebarProps) {
  const stats = snapshot?.stats

  return (
    <aside className="sidebar">
      <TaskBoard tasks={snapshot?.tasks ?? []} />
      <PRList prs={snapshot?.pullRequests ?? []} />
      <HeartbeatIndicator heartbeat={snapshot?.heartbeat ?? null} />

      {stats && (
        <div className="nes-container is-dark with-title sidebar-stats">
          <p className="title">📊 Stats</p>
          <div className="stats-grid">
            <span>PRs hoy</span>
            <span className="stat-value">{stats.prsToday}</span>
            <span>Completadas</span>
            <span className="stat-value">{stats.tasksCompleted}</span>
            <span>Activos</span>
            <span className="stat-value">{stats.agentsActive}</span>
          </div>
        </div>
      )}
    </aside>
  )
}
