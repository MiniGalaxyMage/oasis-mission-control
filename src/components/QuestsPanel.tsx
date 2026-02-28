import { useState, useEffect } from 'react';

interface Quest {
  id: string;
  title: string;
  description: string;
  status: 'active' | 'completed';
  priority: 'main' | 'side';
  assignee: string | null;
  project: string;
  reward: string;
  completedAt?: string;
}

type Filter = 'all' | 'active' | 'completed' | 'main' | 'side';

const PROJECT_COLORS: Record<string, string> = {
  JIS: '#4a90d9',
  OASIS: '#9b59b6',
};

const ASSIGNEE_LABELS: Record<string, string> = {
  forge: '🔨 Forge',
  percival: '🎮 Percival',
  sprite: '✨ Sprite',
};

export function QuestsPanel() {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [filter, setFilter] = useState<Filter>('all');

  function loadQuests() {
    fetch('/assets/room/quests-data.json')
      .then((r) => r.json())
      .then((data) => setQuests(data.quests ?? []))
      .catch((e) => console.error('QuestsPanel: failed to load quests', e));
  }

  useEffect(() => {
    loadQuests();
    const interval = setInterval(loadQuests, 30_000);
    return () => clearInterval(interval);
  }, []);

  const filtered = quests.filter((q) => {
    if (filter === 'all') return true;
    if (filter === 'active') return q.status === 'active';
    if (filter === 'completed') return q.status === 'completed';
    if (filter === 'main') return q.priority === 'main';
    if (filter === 'side') return q.priority === 'side';
    return true;
  });

  const activeQuests = filtered.filter((q) => q.status === 'active');
  const completedQuests = filtered.filter((q) => q.status === 'completed');

  const totalActive = quests.filter((q) => q.status === 'active').length;
  const totalCompleted = quests.filter((q) => q.status === 'completed').length;
  const totalXP = quests.reduce((sum, q) => {
    const xp = parseInt(q.reward.replace(/\D/g, ''), 10) || 0;
    return sum + xp;
  }, 0);

  const FILTERS: { id: Filter; label: string }[] = [
    { id: 'all', label: 'ALL' },
    { id: 'active', label: 'ACTIVE' },
    { id: 'completed', label: 'COMPLETED' },
    { id: 'main', label: 'MAIN' },
    { id: 'side', label: 'SIDE' },
  ];

  return (
    <div
      className="pixel-panel pixel-panel--dark"
      style={{ maxWidth: '860px', margin: '0 auto', padding: '24px', minHeight: '400px' }}
    >
      {/* Header */}
      <div style={{ marginBottom: '16px' }}>
        <h2
          style={{
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '11px',
            color: '#FFD700',
            textShadow: '2px 2px 0 #000',
            margin: '0 0 12px 0',
            letterSpacing: '2px',
          }}
        >
          📜 QUEST LOG
        </h2>

        {/* Stats bar */}
        <div
          style={{
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '7px',
            color: '#aaa',
            marginBottom: '14px',
            letterSpacing: '1px',
          }}
        >
          <span style={{ color: '#FFD700' }}>Active: {totalActive}</span>
          {'  |  '}
          <span style={{ color: '#4caf50' }}>Completed: {totalCompleted}</span>
          {'  |  '}
          <span style={{ color: '#e8d5b5' }}>Total XP: {totalXP}</span>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              style={{
                fontFamily: '"Press Start 2P", monospace',
                fontSize: '7px',
                padding: '4px 8px',
                background: filter === f.id ? '#FFD700' : '#2a2a2a',
                color: filter === f.id ? '#000' : '#888',
                border: `2px solid ${filter === f.id ? '#FFD700' : '#444'}`,
                cursor: 'pointer',
                letterSpacing: '1px',
                imageRendering: 'pixelated',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Active quests */}
      {activeQuests.map((q) => (
        <QuestCard key={q.id} quest={q} />
      ))}

      {/* Divider */}
      {completedQuests.length > 0 && (
        <div
          style={{
            textAlign: 'center',
            color: '#555',
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '7px',
            margin: '20px 0',
            letterSpacing: '2px',
          }}
        >
          ── COMPLETED ──
        </div>
      )}

      {/* Completed quests */}
      {completedQuests.map((q) => (
        <QuestCard key={q.id} quest={q} />
      ))}

      {filtered.length === 0 && (
        <div
          style={{
            textAlign: 'center',
            color: '#555',
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '8px',
            marginTop: '40px',
          }}
        >
          No quests found.
        </div>
      )}
    </div>
  );
}

function QuestCard({ quest }: { quest: Quest }) {
  const isCompleted = quest.status === 'completed';

  return (
    <div
      style={{
        background: '#1a1209',
        border: '2px solid',
        borderColor: isCompleted ? '#3a3020' : '#5a3e10',
        marginBottom: '10px',
        padding: '12px 14px',
        opacity: isCompleted ? 0.7 : 1,
        filter: isCompleted ? 'saturate(0.5)' : 'none',
        imageRendering: 'pixelated',
      }}
    >
      {/* Title row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
        <span style={{ fontSize: '14px' }}>{isCompleted ? '✅' : '⚔️'}</span>
        <span
          style={{
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '8px',
            color: isCompleted ? '#aaa' : '#e8d5b5',
            letterSpacing: '1px',
          }}
        >
          {quest.title}
        </span>
      </div>

      {/* Priority */}
      <div style={{ marginBottom: '6px' }}>
        {quest.priority === 'main' ? (
          <span
            style={{
              fontFamily: '"Press Start 2P", monospace',
              fontSize: '7px',
              color: '#FFD700',
              letterSpacing: '1px',
            }}
          >
            ⭐ MAIN QUEST
          </span>
        ) : (
          <span
            style={{
              fontFamily: '"Press Start 2P", monospace',
              fontSize: '7px',
              color: '#888',
              letterSpacing: '1px',
            }}
          >
            📌 SIDE QUEST
          </span>
        )}
      </div>

      {/* Description */}
      <div
        style={{
          fontFamily: 'monospace',
          fontSize: '11px',
          color: '#ccc',
          marginBottom: '10px',
          lineHeight: '1.5',
        }}
      >
        {quest.description}
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        {/* Project badge */}
        <span
          style={{
            background: PROJECT_COLORS[quest.project] ?? '#555',
            color: '#fff',
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '6px',
            padding: '3px 6px',
            letterSpacing: '1px',
          }}
        >
          {quest.project}
        </span>

        {/* Assignee */}
        {quest.assignee && (
          <span
            style={{
              fontFamily: '"Press Start 2P", monospace',
              fontSize: '7px',
              color: '#b8a060',
              letterSpacing: '1px',
            }}
          >
            {ASSIGNEE_LABELS[quest.assignee] ?? `👤 ${quest.assignee}`}
          </span>
        )}

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Completed date */}
        {isCompleted && quest.completedAt && (
          <span
            style={{
              fontFamily: 'monospace',
              fontSize: '10px',
              color: '#666',
            }}
          >
            {quest.completedAt}
          </span>
        )}

        {/* Reward */}
        <span
          style={{
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '7px',
            color: '#4caf50',
            letterSpacing: '1px',
          }}
        >
          {quest.reward}
        </span>
      </div>
    </div>
  );
}
