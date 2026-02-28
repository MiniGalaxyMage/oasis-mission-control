import { useState } from 'react';
import { OfficeCanvas } from './components/OfficeCanvas';
import { TabBar, Tab } from './components/TabBar';
import { SessionsPanel } from './components/SessionsPanel';
import { CostsPanel } from './components/CostsPanel';

export function App() {
  const [activeTab, setActiveTab] = useState<Tab>('office');

  return (
    <div style={{ textAlign: 'center', padding: '20px', minHeight: '100vh', background: '#0a0a0a' }}>
      <h1
        style={{
          fontFamily: '"Press Start 2P", monospace',
          fontSize: '16px',
          color: '#FFD700',
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
        style={{
          border: '2px solid #2a2a3a',
          background: '#0d0d1a',
          padding: activeTab === 'office' ? '0' : '20px 0',
          textAlign: 'left',
          maxWidth: activeTab === 'office' ? 'fit-content' : '960px',
          margin: '0 auto',
        }}
      >
        {activeTab === 'office' && <OfficeCanvas />}
        {activeTab === 'sessions' && <SessionsPanel />}
        {activeTab === 'costs' && <CostsPanel />}
      </div>

      <p
        style={{
          fontFamily: '"Press Start 2P", monospace',
          fontSize: '8px',
          color: '#666',
          marginTop: '12px',
        }}
      >
        Assets by{' '}
        <a href="https://limezu.itch.io/" style={{ color: '#888' }}>
          LimeZu
        </a>{' '}
        · Powered by OASIS Agent Swarm
      </p>
    </div>
  );
}
