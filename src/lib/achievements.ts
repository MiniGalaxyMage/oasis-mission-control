// ─── Achievement System ────────────────────────────────────────
import { toastManager } from './toast-manager';
import { audioManager } from './audio';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt?: string;
}

const ACHIEVEMENTS_DEF: Omit<Achievement, 'unlocked' | 'unlockedAt'>[] = [
  { id: 'first-visit',   title: 'Welcome to OASIS',  description: 'Visita el Command Center por primera vez', icon: '🏰' },
  { id: 'explorer',      title: 'Explorer',           description: 'Visita las 4 rooms',                      icon: '🗺️' },
  { id: 'konami',        title: 'Ready Player One',   description: 'Descubre el Konami Code',                 icon: '🎮' },
  { id: 'night-owl',     title: 'Night Owl',          description: 'Visita el dashboard después de medianoche', icon: '🦉' },
  { id: 'quest-reader',  title: 'Quest Reader',       description: 'Abre el Quest Log',                       icon: '📜' },
  { id: 'first-dialog',  title: 'Social Butterfly',   description: 'Habla con un agente',                     icon: '💬' },
  { id: 'muted',         title: 'Silence is Golden',  description: 'Silencia el audio',                       icon: '🔇' },
  { id: 'map-traveler',  title: 'Map Traveler',       description: 'Usa el mapa para viajar a una room',      icon: '🧭' },
];

const STORAGE_KEY = 'oasis-achievements';

class AchievementManager {
  private achievements: Map<string, Achievement> = new Map();

  constructor() {
    this.load();
  }

  private load(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const saved: Achievement[] = raw ? JSON.parse(raw) : [];
      const savedMap = new Map(saved.map((a) => [a.id, a]));
      for (const def of ACHIEVEMENTS_DEF) {
        const saved = savedMap.get(def.id);
        this.achievements.set(def.id, {
          ...def,
          unlocked: saved?.unlocked ?? false,
          unlockedAt: saved?.unlockedAt,
        });
      }
    } catch {
      for (const def of ACHIEVEMENTS_DEF) {
        this.achievements.set(def.id, { ...def, unlocked: false });
      }
    }
  }

  private save(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...this.achievements.values()]));
    } catch {/* ignorar */}
  }

  unlock(id: string): boolean {
    const a = this.achievements.get(id);
    if (!a || a.unlocked) return false;
    a.unlocked = true;
    a.unlockedAt = new Date().toISOString();
    this.save();
    // Toast + sound
    toastManager.show('success', `🏆 Achievement: ${a.title}`, `${a.icon} ${a.description}`, '🏆', 6000);
    audioManager.play('task-complete');
    return true;
  }

  getAll(): Achievement[] {
    return [...this.achievements.values()];
  }

  getUnlocked(): Achievement[] {
    return this.getAll().filter((a) => a.unlocked);
  }

  isUnlocked(id: string): boolean {
    return this.achievements.get(id)?.unlocked ?? false;
  }
}

export const achievementManager = new AchievementManager();

// ── Explorer tracker ─────────────────────────────────────────
const EXPLORER_KEY = 'oasis-visited-rooms';
const ALL_ROOMS = ['observatory', 'library', 'forge-room', 'throne'];

export function trackRoomVisit(roomId: string): void {
  try {
    const raw = localStorage.getItem(EXPLORER_KEY);
    const visited: string[] = raw ? JSON.parse(raw) : [];
    if (!visited.includes(roomId)) {
      visited.push(roomId);
      localStorage.setItem(EXPLORER_KEY, JSON.stringify(visited));
    }
    if (ALL_ROOMS.every((r) => visited.includes(r))) {
      achievementManager.unlock('explorer');
    }
  } catch {/* ignorar */}
}
