export interface Snapshot {
  timestamp: string; // ISO 8601
  heartbeat: {
    lastCheck: string; // ISO 8601
    status: 'ok' | 'warning' | 'error';
    minutesAgo: number;
  };
  agents: Agent[];
  tasks: Task[];
  pullRequests: PullRequest[];
  stats: Stats;
}

export interface Agent {
  id: string;          // 'percival', 'forge-alpha', 'forge-beta', etc.
  name: string;        // Display name
  status: 'idle' | 'working' | 'error' | 'done';
  currentTask: string | null; // branch name
  model: 'opus' | 'sonnet' | 'haiku';
  startedAt: string | null;   // ISO 8601
}

export interface Task {
  id: string;
  branch: string;
  title: string;
  agent: string;      // agent id
  status: 'queued' | 'in-progress' | 'pr-open' | 'completed' | 'failed';
  repo: string;       // repo name (sin owner)
  retries: number;
}

export interface PullRequest {
  number: number;
  title: string;
  repo: string;
  url: string;
  status: 'open' | 'merged' | 'closed';
  ci: 'pending' | 'passing' | 'failing' | 'none';
  reviews: 'pending' | 'approved' | 'changes-requested' | 'none';
  author: string;
  createdAt: string;  // ISO 8601
}

export interface Stats {
  prsToday: number;
  prsThisWeek: number;
  tasksCompleted: number;
  tasksInProgress: number;
  agentsActive: number;
  lastDeployAt: string | null;
}

// Tipos internos para datos de gh CLI

export interface GhPR {
  number: number;
  title: string;
  state: string; // OPEN, MERGED, CLOSED
  url: string;
  author: { login: string };
  createdAt: string;
  statusCheckRollup: Array<{ state?: string; conclusion?: string }> | null;
  reviews: Array<{ state: string }> | null;
}

export interface ActiveTask {
  id: string;
  branch: string;
  title: string;
  agent: string;
  status: 'queued' | 'in-progress' | 'pr-open' | 'completed' | 'failed';
  repo: string;
  retries?: number;
  startedAt?: string;
}

export interface HeartbeatState {
  lastChecks: Record<string, number>;
}

export interface CliOptions {
  output: string;
  repos: string[];
  localRepos: string[];
  pretty: boolean;
}
