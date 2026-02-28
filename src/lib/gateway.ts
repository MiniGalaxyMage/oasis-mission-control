/**
 * Agent status provider
 * Reads from a static JSON file updated by Percival via heartbeat/cron
 * Falls back to file-based detection (memory file modification times)
 */

export type AgentStatusType = 'working' | 'idle' | 'sleeping';

export interface AgentStatus {
  id: string;
  name: string;
  status: AgentStatusType;
  currentTask: string;
  model?: string;
  lastSeen: number;
}

type OnAgentsUpdate = (agents: AgentStatus[]) => void;

const STATUS_URL = '/assets/room/agents-status.json';
const POLL_INTERVAL = 15_000; // 15 seconds

export class AgentStatusProvider {
  private onUpdate: OnAgentsUpdate;
  private interval: ReturnType<typeof setInterval> | null = null;

  constructor(opts: { onUpdate: OnAgentsUpdate }) {
    this.onUpdate = opts.onUpdate;
  }

  start() {
    this.fetch();
    this.interval = setInterval(() => this.fetch(), POLL_INTERVAL);
  }

  stop() {
    if (this.interval) clearInterval(this.interval);
  }

  private async fetch() {
    try {
      const res = await window.fetch(`${STATUS_URL}?t=${Date.now()}`);
      if (res.ok) {
        const data: AgentStatus[] = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          this.onUpdate(data);
          return;
        }
      }
    } catch {
      // File not found or parse error — use defaults
    }
    this.onUpdate(defaultAgents());
  }
}

function defaultAgents(): AgentStatus[] {
  return [
    { id: 'percival', name: 'Percival', status: 'sleeping', currentTask: 'zzZ...', lastSeen: 0 },
    { id: 'forge', name: 'Forge', status: 'sleeping', currentTask: 'zzZ...', lastSeen: 0 },
    { id: 'sprite', name: 'Sprite', status: 'sleeping', currentTask: 'zzZ...', lastSeen: 0 },
  ];
}
