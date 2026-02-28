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
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '4px',
        marginBottom: '16px',
        padding: '0 20px',
      }}
    >
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            className={`pixel-tab${isActive ? ' pixel-tab--active' : ''}`}
            style={{
              fontFamily: '"Press Start 2P", monospace',
              position: 'relative',
              marginBottom: isActive ? '-2px' : '0',
              zIndex: isActive ? 1 : 0,
            }}
            onClick={() => onTabChange(tab.id)}
          >
            {tab.emoji} {tab.label}
          </button>
        );
      })}
    </div>
  );
}
