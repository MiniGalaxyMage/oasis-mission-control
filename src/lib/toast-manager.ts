// ─── Toast Manager ─────────────────────────────────────────────
// Singleton para gestionar notificaciones in-game estilo toast pixel art.
import { audioManager } from './audio';

export type ToastType = 'success' | 'info' | 'warning' | 'agent';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message: string;
  icon: string;
  createdAt: number;
  duration: number; // ms
}

const DEFAULT_ICONS: Record<ToastType, string> = {
  success: '✅',
  info: 'ℹ️',
  warning: '⚠️',
  agent: '🤖',
};

const MAX_TOASTS = 4;

class ToastManager {
  private toasts: Toast[] = [];
  private listeners: Set<() => void> = new Set();
  private counter = 0;
  private timers: Map<string, ReturnType<typeof setTimeout>> = new Map();

  show(
    type: ToastType,
    title: string,
    message: string,
    icon?: string,
    duration = 5000,
  ): void {
    const id = `toast-${++this.counter}`;
    const toast: Toast = {
      id,
      type,
      title,
      message,
      icon: icon ?? DEFAULT_ICONS[type],
      createdAt: Date.now(),
      duration,
    };

    // Append at start (más reciente arriba)
    // Sonido según tipo
    if (type === 'success') {
      audioManager.play('task-complete');
    } else if (type === 'agent') {
      audioManager.play('agent-wake');
    } else {
      audioManager.play('click');
    }

    this.toasts = [toast, ...this.toasts];

    // Descartar los más viejos si supera el máximo
    const discarded = this.toasts.splice(MAX_TOASTS);
    for (const old of discarded) {
      clearTimeout(this.timers.get(old.id));
      this.timers.delete(old.id);
    }

    // Auto-dismiss
    const timer = setTimeout(() => this.dismiss(id), duration);
    this.timers.set(id, timer);

    this.notify();
  }

  dismiss(id: string): void {
    clearTimeout(this.timers.get(id));
    this.timers.delete(id);
    this.toasts = this.toasts.filter((t) => t.id !== id);
    this.notify();
  }

  getToasts(): Toast[] {
    return this.toasts;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const fn of this.listeners) fn();
  }
}

export const toastManager = new ToastManager();
