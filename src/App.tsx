import { OfficeCanvas } from './components/OfficeCanvas';

export function App() {
  return (
    <div style={{ textAlign: 'center', padding: '20px' }}>
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
      <OfficeCanvas />
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
