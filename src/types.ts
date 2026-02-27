export interface HeartbeatData {
  lastCheck: string;
  status: 'ok' | 'warn' | 'error';
}

export interface AgentData {
  id: string;
  name: string;
  status: 'idle' | 'working' | 'thinking' | 'orchestrating' | 'error' | 'done';
  currentTask: string | null;
  model: string;
}

export interface TaskData {
  id: string;
  branch: string;
  title: string;
  agent: string;
  status: 'in-progress' | 'done' | 'blocked';
  repo: string;
}

export interface PRData {
  number: number;
  title: string;
  repo: string;
  url: string;
  status: 'open' | 'merged' | 'closed' | 'draft';
  ci: 'passing' | 'failing' | 'running' | 'passed';
  reviews: 'pending' | 'approved' | 'changes_requested';
}

export interface StatsData {
  prsToday: number;
  tasksCompleted: number;
  agentsActive: number;
}

export interface SnapshotData {
  timestamp: string;
  heartbeat: HeartbeatData;
  agents: AgentData[];
  tasks: TaskData[];
  pullRequests: PRData[];
  stats: StatsData;
}
