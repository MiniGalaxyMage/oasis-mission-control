import { useState } from 'react';
import { OfficeCanvas } from './components/OfficeCanvas';
import { TabBar, Tab } from './components/TabBar';
import { SessionsPanel } from './components/SessionsPanel';
import { CostsPanel } from './components/CostsPanel';
import './styles/pixel-ui.css';
import { RoomSelector } from './components/RoomSelector';
import { DEFAULT_ROOM } from './lib/rooms';

export function App() {
  const [activeTab, setActiveTab] = useState<Tab>('office');
  const [selectedRoom, setSelectedRoom] = useState<string>(
    () => localStorage.getItem('oasis-selected-room') ?? DEFAULT_ROOM
  );

  function handleRoomChange(id: string) {
    setSelectedRoom(id);
    localStorage.setItem('oasis-selected-room', id);
  }

  return (
    <div className="pixel-app-bg">
      <h1
        style={{
          fontFamily: '"Press Start 2P", monospace',
          fontSize: '16px',
          color: 'var(--accent-gold)',
          textShadow: '2px 2px 0 #000',
          marginBottom: '16px',
          letterSpacing: '4px',
        }}
      >
        OASIS COMMAND CENTER
      </h1>

      <TabBar activeTab={activeTab} onTabChange={setActiveTab} />

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
