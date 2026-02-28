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
  idle: { emoji: '🟡', label: 'IDLE', color: '#FFD700' },
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

const styles: Record<string, CSSProperties> = {
  container: {
    fontFamily: 'monospace',
    color: '#e0e0e0',
    padding: '0 20px 20px',
    maxWidth: '960px',
    margin: '0 auto',
  },
  header: {
    fontFamily: '"Press Start 2P", monospace',
    fontSize: '11px',
    color: '#FFD700',
    textShadow: '1px 1px 0 #000',
    marginBottom: '16px',
    letterSpacing: '2px',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    border: '2px solid #2a2a3a',
    background: '#1a1a2a',
  },
  th: {
    fontFamily: '"Press Start 2P", monospace',
    fontSize: '7px',
    color: '#FFD700',
    padding: '10px 8px',
    textAlign: 'left' as const,
    borderBottom: '2px solid #2a2a3a',
    letterSpacing: '1px',
    background: '#111122',
  },
  td: {
    fontSize: '11px',
    padding: '10px 8px',
    borderBottom: '1px solid #2a2a3a',
    verticalAlign: 'top' as const,
  },
  footer: {
    fontFamily: '"Press Start 2P", monospace',
    fontSize: '7px',
    color: '#444',
    marginTop: '10px',
    textAlign: 'right' as const,
  },
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

  if (error) return <div style={{ color: '#ff4444', fontFamily: 'monospace', padding: '20px' }}>{error}</div>;
  if (!data) return <div style={{ color: '#666', fontFamily: '"Press Start 2P", monospace', fontSize: '9px', padding: '20px' }}>LOADING...</div>;

  return (
    <div style={styles.container}>
      <p style={styles.header}>💬 ACTIVE SESSIONS</p>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>AGENT</th>
            <th style={styles.th}>STATUS</th>
            <th style={styles.th}>TASK</th>
            <th style={styles.th}>MODEL</th>
            <th style={styles.th}>CHANNEL</th>
            <th style={styles.th}>TOKENS</th>
            <th style={styles.th}>COST</th>
            <th style={styles.th}>LAST SEEN</th>
          </tr>
        </thead>
        <tbody>
          {data.sessions.map((s) => {
            const st = STATUS_CONFIG[s.status] ?? STATUS_CONFIG.sleeping;
            return (
              <tr key={s.id}>
                <td style={{ ...styles.td, fontFamily: '"Press Start 2P", monospace', fontSize: '8px', color: '#FFD700' }}>
                  {s.agent}
                </td>
                <td style={{ ...styles.td, color: st.color, fontFamily: '"Press Start 2P", monospace', fontSize: '7px', whiteSpace: 'nowrap' }}>
                  {st.emoji} {st.label}
                </td>
                <td style={{ ...styles.td, color: '#ccc', maxWidth: '220px', fontSize: '10px' }}>{s.task}</td>
                <td style={{ ...styles.td, color: '#aaa', fontSize: '10px' }}>{s.model}</td>
                <td style={{ ...styles.td, color: '#888', fontSize: '10px' }}>{s.channel}</td>
                <td style={{ ...styles.td, color: '#aaf', textAlign: 'right', fontSize: '10px' }}>{formatTokens(s.tokens)}</td>
                <td style={{ ...styles.td, color: '#4f4', textAlign: 'right', fontSize: '10px' }}>${s.cost.toFixed(2)}</td>
                <td style={{ ...styles.td, color: '#666', fontSize: '10px', whiteSpace: 'nowrap' }}>{formatTime(s.lastActivity)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p style={styles.footer}>UPDATED: {new Date(data.updatedAt).toLocaleTimeString()}</p>
    </div>
  );
}
