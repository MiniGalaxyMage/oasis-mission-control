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

/** Barra de porcentaje pixel art — sin border-radius, bordes cuadrados */
function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <span className="pixel-bar-track">
      <span className="pixel-bar-fill" style={{ width: `${pct}%`, background: color, display: 'block' }} />
    </span>
  );
}

interface KpiCardProps {
  label: string;
  value: string;
  sub: string;
  subColor: string;
}

function KpiCard({ label, value, sub, subColor }: KpiCardProps) {
  return (
    <div className="pixel-panel pixel-kpi-card">
      <div
        style={{
          fontFamily: '"Press Start 2P", monospace',
          fontSize: '7px',
          color: 'var(--text-secondary)',
          marginBottom: '10px',
          letterSpacing: '1px',
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: '"Press Start 2P", monospace',
          fontSize: '18px',
          color: 'var(--accent-gold)',
          marginBottom: '8px',
        }}
      >
        {value}
      </div>
      <div style={{ fontFamily: 'monospace', fontSize: '11px', color: subColor }}>{sub}</div>
    </div>
  );
}

const sectionHeader: CSSProperties = {
  fontFamily: '"Press Start 2P", monospace',
  fontSize: '11px',
  color: 'var(--accent-gold)' as string,
  textShadow: '1px 1px 0 #000',
  marginBottom: '12px',
  marginTop: '24px',
  letterSpacing: '2px',
};

const footer: CSSProperties = {
  fontFamily: '"Press Start 2P", monospace',
  fontSize: '7px',
  color: 'var(--text-secondary)' as string,
  marginTop: '16px',
  textAlign: 'right',
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

  if (error)
    return <div style={{ color: 'var(--accent-red)', fontFamily: 'monospace', padding: '20px' }}>{error}</div>;
  if (!data)
    return (
      <div style={{ color: 'var(--text-secondary)', fontFamily: '"Press Start 2P", monospace', fontSize: '9px', padding: '20px' }}>
        LOADING...
      </div>
    );

  const todayDelta = data.today - data.yesterday;
  const monthDelta = data.thisMonth - data.lastMonth;
  const budgetPct = data.budget > 0 ? Math.round((data.projected / data.budget) * 100) : 0;
  const totalAgentCost = data.byAgent.reduce((s, a) => s + a.cost, 0);
  const maxTokens = Math.max(...data.byModel.map((m) => m.tokens), 1);

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
      {/* KPI Row */}
      <p style={{ ...sectionHeader, marginTop: '0' }}>💰 COST OVERVIEW</p>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <KpiCard
          label="TODAY"
          value={`$${data.today.toFixed(2)}`}
          sub={`${todayDelta >= 0 ? '+' : ''}$${todayDelta.toFixed(2)} vs yesterday`}
          subColor={todayDelta <= 0 ? 'var(--accent-green)' : '#f84'}
        />
        <KpiCard
          label="THIS MONTH"
          value={`$${data.thisMonth.toFixed(2)}`}
          sub={
            data.lastMonth > 0
              ? `$${monthDelta >= 0 ? '+' : ''}${monthDelta.toFixed(2)} vs last month`
              : 'First month of data'
          }
          subColor={monthDelta <= 0 ? 'var(--accent-green)' : '#f84'}
        />
        <KpiCard
          label="PROJECTED"
          value={`$${data.projected.toFixed(2)}`}
          sub={`${budgetPct}% of budget`}
          subColor={budgetPct < 80 ? 'var(--accent-green)' : budgetPct < 100 ? 'var(--accent-gold)' : 'var(--accent-red)'}
        />
        <KpiCard
          label="BUDGET"
          value={`$${data.budget.toFixed(2)}`}
          sub={`$${(data.budget - data.projected).toFixed(2)} remaining`}
          subColor={data.budget - data.projected >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'}
        />
      </div>

      {/* By Agent */}
      <p style={sectionHeader}>🧙 BY AGENT</p>
      <div className="pixel-panel--dark" style={{ padding: '0' }}>
        <table className="pixel-table">
          <thead>
            <tr>
              <th>AGENT</th>
              <th>TOKENS</th>
              <th>COST</th>
              <th>% TOTAL</th>
            </tr>
          </thead>
          <tbody>
            {data.byAgent.map((a) => {
              const pct = totalAgentCost > 0 ? (a.cost / totalAgentCost) * 100 : 0;
              return (
                <tr key={a.agent}>
                  <td
                    style={{
                      fontFamily: '"Press Start 2P", monospace',
                      fontSize: '8px',
                      color: 'var(--accent-gold)',
                    }}
                  >
                    {a.agent}
                  </td>
                  <td style={{ color: '#aaf', textAlign: 'right' }}>{a.tokens.toLocaleString()}</td>
                  <td style={{ color: 'var(--accent-green)', textAlign: 'right' }}>${a.cost.toFixed(2)}</td>
                  <td>
                    {pct.toFixed(1)}%
                    <Bar value={pct} max={100} color="var(--accent-gold)" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* By Model */}
      <p style={sectionHeader}>🤖 BY MODEL</p>
      <div className="pixel-panel--dark" style={{ padding: '0' }}>
        <table className="pixel-table">
          <thead>
            <tr>
              <th>MODEL</th>
              <th>TOKENS</th>
              <th>COST</th>
              <th>USAGE</th>
            </tr>
          </thead>
          <tbody>
            {data.byModel.map((m) => (
              <tr key={m.model}>
                <td
                  style={{
                    fontFamily: '"Press Start 2P", monospace',
                    fontSize: '7px',
                    color: 'var(--text-secondary)',
                  }}
                >
                  {m.model}
                </td>
                <td style={{ color: '#aaf', textAlign: 'right' }}>{m.tokens.toLocaleString()}</td>
                <td style={{ color: 'var(--accent-green)', textAlign: 'right' }}>${m.cost.toFixed(2)}</td>
                <td>
                  <Bar value={m.tokens} max={maxTokens} color="#5af" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p style={footer}>UPDATED: {new Date(data.updatedAt).toLocaleTimeString()}</p>
    </div>
  );
}
