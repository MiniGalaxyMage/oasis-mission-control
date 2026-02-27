import { Agent, PullRequest, Snapshot, Stats, Task } from './types';

interface BuildSnapshotParams {
  agents: Agent[];
  tasks: Task[];
  pullRequests: PullRequest[];
  completedTasksCount: number;
  heartbeat: Snapshot['heartbeat'];
  lastDeployAt?: string | null;
}

export function buildSnapshot(params: BuildSnapshotParams): Snapshot {
  const { agents, tasks, pullRequests, completedTasksCount, heartbeat, lastDeployAt } = params;

  const stats = computeStats({
    agents,
    tasks,
    pullRequests,
    completedTasksCount,
    lastDeployAt: lastDeployAt ?? null,
  });

  return {
    timestamp: new Date().toISOString(),
    heartbeat,
    agents,
    tasks,
    pullRequests,
    stats,
  };
}

function computeStats(params: {
  agents: Agent[];
  tasks: Task[];
  pullRequests: PullRequest[];
  completedTasksCount: number;
  lastDeployAt: string | null;
}): Stats {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart);
  weekStart.setDate(todayStart.getDate() - todayStart.getDay());

  let prsToday = 0;
  let prsThisWeek = 0;

  for (const pr of params.pullRequests) {
    const created = new Date(pr.createdAt);
    if (created >= todayStart) prsToday++;
    if (created >= weekStart) prsThisWeek++;
  }

  const tasksInProgress = params.tasks.filter((t) => t.status === 'in-progress').length;
  const agentsActive = params.agents.filter((a) => a.status === 'working').length;

  return {
    prsToday,
    prsThisWeek,
    tasksCompleted: params.completedTasksCount,
    tasksInProgress,
    agentsActive,
    lastDeployAt: params.lastDeployAt,
  };
}
