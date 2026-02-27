import './PRList.css'
import type { PRData } from '../../types'

interface PRListProps {
  prs: PRData[]
}

const PR_STATUS_ICONS: Record<PRData['status'], string> = {
  open: '🟡',
  merged: '🟣',
  closed: '🔴',
  draft: '⬜',
}

const CI_ICONS: Record<PRData['ci'], string> = {
  passing: '✅',
  passed: '✅',
  failing: '❌',
  running: '🔄',
}

export function PRList({ prs }: PRListProps) {
  // Mostrar los últimos 6 PRs
  const displayed = prs.slice(0, 6)

  return (
    <div className="nes-container is-dark with-title pr-list">
      <p className="title">🔀 Pull Requests</p>
      {displayed.length === 0 ? (
        <p className="empty-msg">Sin PRs</p>
      ) : (
        <ul className="pr-items">
          {displayed.map(pr => (
            <li key={pr.number} className="pr-item">
              <span className="pr-status-icon">{PR_STATUS_ICONS[pr.status]}</span>
              <span className="pr-info">
                <a
                  href={pr.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="pr-title"
                >
                  #{pr.number} {pr.title}
                </a>
                <span className="pr-meta">
                  <span className="pr-repo">{pr.repo}</span>
                  <span className="pr-ci">{CI_ICONS[pr.ci]}</span>
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
