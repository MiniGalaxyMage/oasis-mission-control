import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { HeartbeatState, Snapshot } from './types';

const HEARTBEAT_FILE = path.join(
  os.homedir(),
  '.openclaw',
  'workspace',
  'memory',
  'heartbeat-state.json'
);

export function readHeartbeat(): Snapshot['heartbeat'] {
  try {
    if (!fs.existsSync(HEARTBEAT_FILE)) {
      console.warn('  ⚠️  heartbeat-state.json no encontrado, usando valores por defecto');
      return buildFallbackHeartbeat();
    }

    const content = fs.readFileSync(HEARTBEAT_FILE, 'utf-8');
    const state = JSON.parse(content) as HeartbeatState;

    const timestamps = Object.values(state.lastChecks ?? {}).filter(
      (v) => typeof v === 'number' && v > 0
    );

    if (timestamps.length === 0) {
      return buildFallbackHeartbeat();
    }

    const mostRecent = Math.max(...timestamps);
    const nowMs = Date.now();
    const minutesAgo = Math.floor((nowMs - mostRecent * 1000) / 60000);

    let status: Snapshot['heartbeat']['status'];
    if (minutesAgo < 60) {
      status = 'ok';
    } else if (minutesAgo < 180) {
      status = 'warning';
    } else {
      status = 'error';
    }

    return {
      lastCheck: new Date(mostRecent * 1000).toISOString(),
      status,
      minutesAgo,
    };
  } catch (err) {
    console.warn(`  ⚠️  Error leyendo heartbeat: ${err instanceof Error ? err.message : err}`);
    return buildFallbackHeartbeat();
  }
}

function buildFallbackHeartbeat(): Snapshot['heartbeat'] {
  return {
    lastCheck: new Date().toISOString(),
    status: 'error',
    minutesAgo: 999,
  };
}
