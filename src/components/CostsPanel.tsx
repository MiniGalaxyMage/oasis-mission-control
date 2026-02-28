import { useEffect, useState, CSSProperties } from 'react';

interface AgentCost {
  agent: string;
  tokens: number;
  cost: number;
}

interface ModelCost {
  model: string;
  tokens: number;
  cost: number;
}

interface CostsData {
  today: number;
  yesterday: number;
  thisMonth: number;
  lastMonth: number;
  projected: number;
  budget: number;
  byAgent: AgentCost[];
  byModel: ModelCost[];
  updatedAt: string;
}

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div style={{ background: '#111', border: '1px solid #2a2a3a', height: '8px', width: '80px', display: 'inline-block', verticalAlign: 'middle', marginLeft: '6px' }}>
      <div style={{ width: `${pct}%`, height: '100%', background: color }} />
    </div>
  );
}

interface KpiCardProps {
  label: string;
  value: string;
  sub: string;
  subColor: string;
}

function KpiCard({ label, value, sub, subColor }: KpiCardProps) {
  const cardStyle: CSSProperties = {
    flex: '1',
    minWidth: '160px',
    background: '#1a1a2a',
    border: '2px solid #2a2a3a',
    padding: '16px',
    textAlign: 'left',
  };
  return (
    <div style={cardStyle}>
      <div style={{ fontFamily: '"Press Start 2P", monospace', fontSize: '7px', color: '#666', marginBottom: '10px', letterSpacing: '1px' }}>
        {label}
      </div>
      <div style={{ fontFamily: '"Press Start 2P", monospace', fontSize: '18px', color: '#FFD700', marginBottom: '8px' }}>
        {value}
      </div>
      <div style={{ fontFamily: 'monospace', fontSize: '11px', color: subColor }}>{sub}</div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  container: {
    fontFamily: 'monospace',
    color: '#e0e0e0',
    padding: '0 20px 20px',
    maxWidth: '960px',
    margin: '0 auto',
  },
  sectionHeader: {
    fontFamily: '"Press Start 2P", monospace',
    fontSize: '11px',
    color: '#FFD700',
    textShadow: '1px 1px 0 #000',
    marginBottom: '12px',
    marginTop: '24px',
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
    background: '#111122',
    letterSpacing: '1px',
  },
  td: {
    fontSize: '11px',
    padding: '10px 8px',
    borderBottom: '1px solid #1e1e2e',
  },
  footer: {
    fontFamily: '"Press Start 2P", monospace',
    fontSize: '7px',
    color: '#444',
    marginTop: '16px',
    textAlign: 'right' as const,
  },
};

export function CostsPanel() {
  const [data, setData] = useState<CostsData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/assets/room/costs-data.json')
      .then((r) => r.json())
      .then(setData)
      .catch(() => setError('Failed to load costs-data.json'));
  }, []);

  if (error) return <div style={{ color: '#ff4444', fontFamily: 'monospace', padding: '20px' }}>{error}</div>;
  if (!data) return <div style={{ color: '#666', fontFamily: '"Press Start 2P", monospace', fontSize: '9px', padding: '20px' }}>LOADING...</div>;

  const todayDelta = data.today - data.yesterday;
  const monthDelta = data.thisMonth - data.lastMonth;
  const budgetPct = data.budget > 0 ? Math.round((data.projected / data.budget) * 100) : 0;
  const totalAgentCost = data.byAgent.reduce((s, a) => s + a.cost, 0);
  const maxTokens = Math.max(...data.byModel.map((m) => m.tokens), 1);

  return (
    <div style={styles.container}>
      {/* KPI Row */}
      <p style={{ ...styles.sectionHeader, marginTop: '0' }}>💰 COST OVERVIEW</p>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <KpiCard
          label="TODAY"
          value={`$${data.today.toFixed(2)}`}
          sub={`${todayDelta >= 0 ? '+' : ''}$${todayDelta.toFixed(2)} vs yesterday`}
          subColor={todayDelta <= 0 ? '#4f4' : '#f84'}
        />
        <KpiCard
          label="THIS MONTH"
          value={`$${data.thisMonth.toFixed(2)}`}
          sub={data.lastMonth > 0 ? `$${monthDelta >= 0 ? '+' : ''}${monthDelta.toFixed(2)} vs last month` : 'First month of data'}
          subColor={monthDelta <= 0 ? '#4f4' : '#f84'}
        />
        <KpiCard
          label="PROJECTED"
          value={`$${data.projected.toFixed(2)}`}
          sub={`${budgetPct}% of budget`}
          subColor={budgetPct < 80 ? '#4f4' : budgetPct < 100 ? '#FFD700' : '#f44'}
        />
        <KpiCard
          label="BUDGET"
          value={`$${data.budget.toFixed(2)}`}
          sub={`$${(data.budget - data.projected).toFixed(2)} remaining`}
          subColor={data.budget - data.projected >= 0 ? '#4f4' : '#f44'}
        />
      </div>

      {/* By Agent */}
      <p style={styles.sectionHeader}>🧙 BY AGENT</p>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>AGENT</th>
            <th style={styles.th}>TOKENS</th>
            <th style={styles.th}>COST</th>
            <th style={styles.th}>% TOTAL</th>
          </tr>
        </thead>
        <tbody>
          {data.byAgent.map((a) => {
            const pct = totalAgentCost > 0 ? (a.cost / totalAgentCost) * 100 : 0;
            return (
              <tr key={a.agent}>
                <td style={{ ...styles.td, fontFamily: '"Press Start 2P", monospace', fontSize: '8px', color: '#FFD700' }}>{a.agent}</td>
                <td style={{ ...styles.td, color: '#aaf', textAlign: 'right' }}>{a.tokens.toLocaleString()}</td>
                <td style={{ ...styles.td, color: '#4f4', textAlign: 'right' }}>${a.cost.toFixed(2)}</td>
                <td style={{ ...styles.td, color: '#ccc' }}>
                  {pct.toFixed(1)}%
                  <Bar value={pct} max={100} color="#FFD700" />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* By Model */}
      <p style={styles.sectionHeader}>🤖 BY MODEL</p>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>MODEL</th>
            <th style={styles.th}>TOKENS</th>
            <th style={styles.th}>COST</th>
            <th style={styles.th}>USAGE</th>
          </tr>
        </thead>
        <tbody>
          {data.byModel.map((m) => (
            <tr key={m.model}>
              <td style={{ ...styles.td, fontFamily: '"Press Start 2P", monospace', fontSize: '7px', color: '#aaa' }}>{m.model}</td>
              <td style={{ ...styles.td, color: '#aaf', textAlign: 'right' }}>{m.tokens.toLocaleString()}</td>
              <td style={{ ...styles.td, color: '#4f4', textAlign: 'right' }}>${m.cost.toFixed(2)}</td>
              <td style={{ ...styles.td }}>
                <Bar value={m.tokens} max={maxTokens} color="#5af" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <p style={styles.footer}>UPDATED: {new Date(data.updatedAt).toLocaleTimeString()}</p>
    </div>
  );
}
