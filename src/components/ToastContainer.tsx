import { useEffect, useRef, useState } from 'react';
import { toastManager, type Toast, type ToastType } from '../lib/toast-manager';

// ─── Estilos por tipo ──────────────────────────────────────────
const TYPE_STYLES: Record<ToastType, { bg: string; border: string }> = {
  success: { bg: '#1a2a1a', border: '#4ADE80' },
  info:    { bg: '#1a1a2a', border: '#60A5FA' },
  warning: { bg: '#2a2a1a', border: '#FBBF24' },
  agent:   { bg: '#1a1209', border: '#FFD700' },
};

// ─── CSS animations (inyectadas una sola vez) ──────────────────
const STYLE_ID = 'toast-animations';

function ensureStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    @keyframes toastSlideIn {
      from { transform: translateX(120%); opacity: 0; }
      to   { transform: translateX(0);   opacity: 1; }
    }
    @keyframes toastFadeOut {
      from { opacity: 1; }
      to   { opacity: 0; }
    }
    @keyframes toastProgress {
      from { width: 100%; }
      to   { width: 0%;   }
    }
  `;
  document.head.appendChild(style);
}

// ─── Single Toast ──────────────────────────────────────────────
interface ToastItemProps {
  toast: Toast;
  onDismiss: (id: string) => void;
}

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const { bg, border } = TYPE_STYLES[toast.type];
  const [exiting, setExiting] = useState(false);

  function handleDismiss() {
    setExiting(true);
    setTimeout(() => onDismiss(toast.id), 300);
  }

  return (
    <div
      style={{
        position: 'relative',
        width: '320px',
        background: bg,
        border: `2px solid ${border}`,
        padding: '10px 14px',
        boxSizing: 'border-box',
        imageRendering: 'pixelated',
        animation: exiting
          ? 'toastFadeOut 300ms ease-out forwards'
          : 'toastSlideIn 300ms ease-out forwards',
        overflow: 'hidden',
      }}
    >
      {/* Layout: icono + texto + botón ✕ */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', paddingRight: '20px' }}>
        {/* Icono */}
        <span style={{ fontSize: '20px', lineHeight: 1, flexShrink: 0 }}>{toast.icon}</span>

        {/* Texto */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontFamily: '"Press Start 2P", monospace',
              fontSize: '8px',
              color: border,
              marginBottom: '5px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {toast.title}
          </div>
          <div
            style={{
              fontFamily: 'monospace',
              fontSize: '10px',
              color: '#ccc',
              lineHeight: '1.4',
              wordBreak: 'break-word',
            }}
          >
            {toast.message}
          </div>
        </div>
      </div>

      {/* Botón dismiss */}
      <button
        onClick={handleDismiss}
        style={{
          position: 'absolute',
          top: '6px',
          right: '6px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          fontFamily: '"Press Start 2P", monospace',
          fontSize: '8px',
          color: border,
          padding: '2px 4px',
          lineHeight: 1,
        }}
      >
        ×
      </button>

      {/* Progress bar */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          height: '2px',
          background: border,
          animationName: 'toastProgress',
          animationDuration: `${toast.duration}ms`,
          animationTimingFunction: 'linear',
          animationFillMode: 'forwards',
        }}
      />
    </div>
  );
}

// ─── Container ─────────────────────────────────────────────────
export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>(() => toastManager.getToasts());
  const mountedRef = useRef(true);

  useEffect(() => {
    ensureStyles();
    mountedRef.current = true;
    const unsub = toastManager.subscribe(() => {
      if (mountedRef.current) setToasts([...toastManager.getToasts()]);
    });
    return () => {
      mountedRef.current = false;
      unsub();
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: 'absolute',
        top: '12px',
        right: '48px', // dejar espacio al botón mute
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        pointerEvents: 'none',
      }}
    >
      {toasts.map((t) => (
        <div key={t.id} style={{ pointerEvents: 'all' }}>
          <ToastItem
            toast={t}
            onDismiss={(id) => toastManager.dismiss(id)}
          />
        </div>
      ))}
    </div>
  );
}
