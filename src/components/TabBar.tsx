import { CSSProperties } from 'react';

export type Tab = 'office' | 'sessions' | 'costs';

interface TabBarProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

const TABS: { id: Tab; label: string; emoji: string }[] = [
  { id: 'office', label: 'OFFICE', emoji: '🏰' },
  { id: 'sessions', label: 'SESSIONS', emoji: '💬' },
  { id: 'costs', label: 'COSTS', emoji: '💰' },
];

export function TabBar({ activeTab, onTabChange }: TabBarProps) {
  const containerStyle: CSSProperties = {
    display: 'flex',
    justifyContent: 'center',
    gap: '4px',
    marginBottom: '16px',
    padding: '0 20px',
  };

  const tabStyle = (isActive: boolean): CSSProperties => ({
    fontFamily: '"Press Start 2P", monospace',
    fontSize: '9px',
    padding: '10px 16px',
    background: isActive ? '#1a1a2a' : '#0d0d1a',
    color: isActive ? '#FFD700' : '#666',
    border: `2px solid ${isActive ? '#FFD700' : '#2a2a3a'}`,
    borderBottom: isActive ? '2px solid #1a1a2a' : '2px solid #2a2a3a',
    cursor: 'pointer',
    letterSpacing: '1px',
    outline: 'none',
    transition: 'color 0.1s, border-color 0.1s',
    position: 'relative',
    marginBottom: isActive ? '-2px' : '0',
    zIndex: isActive ? 1 : 0,
  });

  return (
    <div style={containerStyle}>
      {TABS.map((tab) => (
        <button
          key={tab.id}
          style={tabStyle(activeTab === tab.id)}
          onClick={() => onTabChange(tab.id)}
          onMouseEnter={(e) => {
            if (activeTab !== tab.id) {
              (e.currentTarget as HTMLButtonElement).style.color = '#aaa';
              (e.currentTarget as HTMLButtonElement).style.borderColor = '#444';
            }
          }}
          onMouseLeave={(e) => {
            if (activeTab !== tab.id) {
              (e.currentTarget as HTMLButtonElement).style.color = '#666';
              (e.currentTarget as HTMLButtonElement).style.borderColor = '#2a2a3a';
            }
          }}
        >
          {tab.emoji} {tab.label}
        </button>
      ))}
    </div>
  );
}
