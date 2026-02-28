import { useEffect, useRef, useState } from 'react';

const AGENT_ICONS: Record<string, string> = {
  forge: '⚔️',
  percival: '🧙',
  sprite: '🧚',
};

interface DialogBoxProps {
  agent: {
    id: string;
    name: string;
    color: string;
    status: string;
    currentTask: string;
    lastSeen?: number;
  };
  onClose: () => void;
}

function formatLastSeen(lastSeen?: number): string {
  if (!lastSeen) return 'unknown';
  const diff = Math.floor((Date.now() - lastSeen) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

export function DialogBox({ agent, onClose }: DialogBoxProps) {
  const icon = AGENT_ICONS[agent.id] ?? '🤖';
  const fullText = `Status: ${agent.status}\nTask: ${agent.currentTask}\nLast seen: ${formatLastSeen(agent.lastSeen)}`;

  const [displayed, setDisplayed] = useState('');
  const indexRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Typewriter effect
  useEffect(() => {
    indexRef.current = 0;
    setDisplayed('');

    function tick() {
      if (indexRef.current < fullText.length) {
        indexRef.current++;
        setDisplayed(fullText.slice(0, indexRef.current));
        timerRef.current = setTimeout(tick, 30);
      }
    }
    timerRef.current = setTimeout(tick, 30);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [agent.id, fullText]);

  // Keyboard close
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <>
      {/* Dark overlay — click outside to close */}
      <div
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0,0,0,0.35)',
          zIndex: 10,
        }}
      />

      {/* Dialog box */}
      <div
        style={{
          position: 'absolute',
          bottom: '12px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '80%',
          minHeight: '120px',
          background: '#1a1209',
          border: '3px solid #6b4c2a',
          boxShadow: '0 0 0 1px #3a2a14, 4px 4px 0 #000',
          padding: '12px 16px',
          zIndex: 11,
          fontFamily: 'monospace',
          color: '#f0dfc0',
          boxSizing: 'border-box',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <span
            style={{
              fontFamily: '"Press Start 2P", monospace',
              fontSize: '10px',
              color: agent.color,
              letterSpacing: '1px',
            }}
          >
            {icon} {agent.name.toUpperCase()}
          </span>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: '1px solid #6b4c2a',
              color: '#f0dfc0',
              cursor: 'pointer',
              fontFamily: '"Press Start 2P", monospace',
              fontSize: '8px',
              padding: '2px 6px',
              lineHeight: 1.5,
            }}
          >
            [X]
          </button>
        </div>

        {/* Typewriter text */}
        <pre
          style={{
            margin: 0,
            fontSize: '12px',
            lineHeight: '1.7',
            fontFamily: 'monospace',
            color: '#f0dfc0',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {displayed}
          <span style={{ opacity: displayed.length < fullText.length ? 1 : 0 }}>▋</span>
        </pre>
      </div>
    </>
  );
}
