import { useEffect, useState, CSSProperties } from 'react';

interface Session {
  id: string;
  agent: string;
  status: 'working' | 'idle' | 'sleeping';
  task: string;
  model: string;
  channel: string;
  lastActivity: string;
  tokens: number;
  cost: number;
}

interface SessionsData {
  sessions: Session[];
  updatedAt: string;
}

const STATUS_CONFIG = {
  working: { emoji: '🟢', label: 'WORKING', color: '#00ff88' },
  idle: { emoji: '🟡', label: 'IDLE', color: 'var(--accent-gold)' },
  sleeping: { emoji: '⚫', label: 'SLEEPING', color: '#555' },
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  return `${Math.floor(diffH / 24)}d ago`;
}

function formatTokens(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

const header: CSSProperties = {
  fontFamily: '"Press Start 2P", monospace',
  fontSize: '11px',
  color: 'var(--accent-gold)' as string,
  textShadow: '1px 1px 0 #000',
  marginBottom: '16px',
  letterSpacing: '2px',
};

const footer: CSSProperties = {
  fontFamily: '"Press Start 2P", monospace',
  fontSize: '7px',
  color: 'var(--text-secondary)' as string,
  marginTop: '10px',
  textAlign: 'right',
};

export function SessionsPanel() {
  const [data, setData] = useState<SessionsData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/assets/room/sessions-data.json')
      .then((r) => r.json())
      .then(setData)
      .catch(() => setError('Failed to load sessions-data.json'));
  }, []);

  if (error)
    return <div style={{ color: 'var(--accent-red)', fontFamily: 'monospace', padding: '20px' }}>{error}</div>;
  if (!data)
    return (
      <div style={{ color: 'var(--text-secondary)', fontFamily: '"Press Start 2P", monospace', fontSize: '9px', padding: '20px' }}>
        LOADING...
      </div>
    );

  return (
    <div
      style={{
        fontFamily: 'monospace',
        color: 'var(--text-primary)',
        padding: '0 20px 20px',
        maxWidth: '960px',
        margin: '0 auto',
      }}
    >
      <p style={header}>💬 ACTIVE SESSIONS</p>

      {/* Tabla dentro de pixel-panel--dark */}
      <div className="pixel-panel--dark" style={{ padding: '0' }}>
        <table className="pixel-table">
          <thead>
            <tr>
              <th>AGENT</th>
              <th>STATUS</th>
              <th>TASK</th>
              <th>MODEL</th>
              <th>CHANNEL</th>
              <th>TOKENS</th>
              <th>COST</th>
              <th>LAST SEEN</th>
            </tr>
          </thead>
          <tbody>
            {data.sessions.map((s) => {
              const st = STATUS_CONFIG[s.status] ?? STATUS_CONFIG.sleeping;
              return (
                <tr key={s.id}>
                  <td
                    style={{
                      fontFamily: '"Press Start 2P", monospace',
                      fontSize: '8px',
                      color: 'var(--accent-gold)',
                    }}
                  >
                    {s.agent}
                  </td>
                  <td
                    style={{
                      color: st.color,
                      fontFamily: '"Press Start 2P", monospace',
                      fontSize: '7px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {st.emoji} {st.label}
                  </td>
                  <td style={{ color: 'var(--text-primary)', maxWidth: '220px', fontSize: '10px' }}>{s.task}</td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '10px' }}>{s.model}</td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '10px' }}>{s.channel}</td>
                  <td style={{ color: '#aaf', textAlign: 'right', fontSize: '10px' }}>{formatTokens(s.tokens)}</td>
                  <td style={{ color: 'var(--accent-green)', textAlign: 'right', fontSize: '10px' }}>${s.cost.toFixed(2)}</td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '10px', whiteSpace: 'nowrap' }}>
                    {formatTime(s.lastActivity)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p style={footer}>UPDATED: {new Date(data.updatedAt).toLocaleTimeString()}</p>
    </div>
  );
}
