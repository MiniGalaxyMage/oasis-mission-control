import { useState, useRef, useCallback } from 'react';
import { OfficeCanvas } from './components/OfficeCanvas';
import { TabBar, Tab } from './components/TabBar';
import { SessionsPanel } from './components/SessionsPanel';
import { CostsPanel } from './components/CostsPanel';
import { WorldMap } from './components/WorldMap';
import { QuestsPanel } from './components/QuestsPanel';
import './styles/pixel-ui.css';
import { RoomSelector } from './components/RoomSelector';
import { DEFAULT_ROOM } from './lib/rooms';
import { achievementManager } from './lib/achievements';
import { toastManager } from './lib/toast-manager';

export function App() {
  const [activeTab, setActiveTab] = useState<Tab>('office');
  const [selectedRoom, setSelectedRoom] = useState<string>(
    () => localStorage.getItem('oasis-selected-room') ?? DEFAULT_ROOM
  );
  const [titleRainbow, setTitleRainbow] = useState(false);
  const titleClickCountRef = useRef(0);
  const titleClickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleRoomChange(id: string) {
    setSelectedRoom(id);
    localStorage.setItem('oasis-selected-room', id);
  }

  function handleTabChange(tab: Tab) {
    setActiveTab(tab);
    if (tab === 'quests') {
      achievementManager.unlock('quest-reader');
    }
  }

  const handleTitleClick = useCallback(() => {
    titleClickCountRef.current += 1;
    if (titleClickTimerRef.current) clearTimeout(titleClickTimerRef.current);
    titleClickTimerRef.current = setTimeout(() => {
      titleClickCountRef.current = 0;
    }, 2000);
    if (titleClickCountRef.current >= 10) {
      titleClickCountRef.current = 0;
      setTitleRainbow(true);
      toastManager.show('info', '🕹️ You found a secret!', 'The cake is a lie.', '🕹️', 4000);
      setTimeout(() => setTitleRainbow(false), 3000);
    }
  }, []);

  return (
    <div className="pixel-app-bg">
      <h1
        onClick={handleTitleClick}
        style={{
          fontFamily: '"Press Start 2P", monospace',
          fontSize: '16px',
          color: titleRainbow ? undefined : 'var(--accent-gold)',
          textShadow: '2px 2px 0 #000',
          marginBottom: '16px',
          letterSpacing: '4px',
          cursor: 'default',
          userSelect: 'none',
          animation: titleRainbow ? 'rainbow-text 0.4s linear infinite' : undefined,
        }}
      >
        OASIS COMMAND CENTER
      </h1>

      <TabBar activeTab={activeTab} onTabChange={handleTabChange} />

      {/* Tab content wrapper */}
      <div
        className="pixel-content-wrap"
        style={{
          padding: activeTab === 'office' ? '0' : '20px 0',
          maxWidth: activeTab === 'office' ? 'fit-content' : '960px',
        }}
      >
        {activeTab === 'office' && (
          <>
            <RoomSelector activeRoom={selectedRoom} onRoomChange={handleRoomChange} />
            <OfficeCanvas roomId={selectedRoom} />
          </>
        )}
        {activeTab === 'map' && (
          <WorldMap
            selectedRoom={selectedRoom}
            onRoomSelect={(id) => {
              handleRoomChange(id);
              setActiveTab('office');
            }}
            agents={['percival', 'forge', 'sprite']}
          />
        )}
        {activeTab === 'quests' && <QuestsPanel />}
        {activeTab === 'sessions' && <SessionsPanel />}
        {activeTab === 'costs' && <CostsPanel />}
      </div>

      <p
        style={{
          fontFamily: '"Press Start 2P", monospace',
          fontSize: '8px',
          color: 'var(--text-secondary)',
          marginTop: '12px',
        }}
      >
        Assets by{' '}
        <a href="https://limezu.itch.io/" style={{ color: 'var(--text-primary)' }}>
          LimeZu
        </a>{' '}
        · Powered by OASIS Agent Swarm
      </p>
    </div>
  );
}
