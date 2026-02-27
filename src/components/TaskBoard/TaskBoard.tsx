import './TaskBoard.css'
import type { TaskData } from '../../types'

interface TaskBoardProps {
  tasks: TaskData[]
}

const STATUS_ICONS: Record<TaskData['status'], string> = {
  'in-progress': '⚡',
  'done': '✅',
  'blocked': '🔴',
}

const STATUS_COLORS: Record<TaskData['status'], string> = {
  'in-progress': '#ffd700',
  'done': '#4caf50',
  'blocked': '#f44336',
}

export function TaskBoard({ tasks }: TaskBoardProps) {
  return (
    <div className="nes-container is-dark with-title task-board">
      <p className="title">📋 Tareas</p>
      {tasks.length === 0 ? (
        <p className="empty-msg">Sin tareas activas</p>
      ) : (
        <ul className="task-list">
          {tasks.map(task => (
            <li key={task.id} className="task-item">
              <span
                className="task-status-icon"
                style={{ color: STATUS_COLORS[task.status] }}
              >
                {STATUS_ICONS[task.status]}
              </span>
              <span className="task-info">
                <span className="task-branch">{task.branch}</span>
                <span className="task-agent">@{task.agent}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
