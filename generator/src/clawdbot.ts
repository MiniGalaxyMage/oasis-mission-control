import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ActiveTask, Agent, Task } from './types';

function expandHome(p: string): string {
  if (p.startsWith('~/')) {
    return path.join(os.homedir(), p.slice(2));
  }
  return p;
}

function readJsonFile<T>(filePath: string): T | null {
  try {
    const resolved = expandHome(filePath);
    if (!fs.existsSync(resolved)) return null;
    const content = fs.readFileSync(resolved, 'utf-8');
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

function getRepoName(repoPath: string): string {
  return path.basename(expandHome(repoPath));
}

export function readActiveTasks(localRepos: string[]): ActiveTask[] {
  const allTasks: ActiveTask[] = [];

  for (const repoPath of localRepos) {
    const repoName = getRepoName(repoPath);
    const tasksPath = path.join(expandHome(repoPath), '.clawdbot', 'active-tasks.json');
    const tasks = readJsonFile<ActiveTask[]>(tasksPath);

    if (tasks && Array.isArray(tasks)) {
      for (const task of tasks) {
        allTasks.push({
          ...task,
          repo: task.repo ?? repoName,
        });
      }
      console.log(`  📂 ${repoName}: ${tasks.length} tarea(s) activa(s)`);
    } else {
      console.log(`  📂 ${repoName}: sin archivo active-tasks.json`);
    }
  }

  return allTasks;
}

export function readCompletedTasks(localRepos: string[]): ActiveTask[] {
  const allTasks: ActiveTask[] = [];

  for (const repoPath of localRepos) {
    const repoName = getRepoName(repoPath);
    const tasksPath = path.join(expandHome(repoPath), '.clawdbot', 'completed-tasks.json');
    const tasks = readJsonFile<ActiveTask[]>(tasksPath);

    if (tasks && Array.isArray(tasks)) {
      for (const task of tasks) {
        allTasks.push({
          ...task,
          repo: task.repo ?? repoName,
        });
      }
    }
  }

  return allTasks;
}

export function buildTaskList(activeTasks: ActiveTask[]): Task[] {
  return activeTasks.map((t) => ({
    id: t.id,
    branch: t.branch,
    title: t.title,
    agent: t.agent,
    status: t.status,
    repo: t.repo,
    retries: t.retries ?? 0,
  }));
}

const KNOWN_AGENTS: Array<{ id: string; name: string; model: Agent['model'] }> = [
  { id: 'percival', name: 'Percival', model: 'opus' },
  { id: 'forge-alpha', name: 'Forge Alpha', model: 'sonnet' },
  { id: 'forge-beta', name: 'Forge Beta', model: 'sonnet' },
];

export function buildAgentList(
  activeTasks: ActiveTask[],
  heartbeatMinutesAgo: number
): Agent[] {
  const agentTaskMap = new Map<string, ActiveTask>();

  for (const task of activeTasks) {
    if (task.status === 'in-progress') {
      agentTaskMap.set(task.agent, task);
    }
  }

  return KNOWN_AGENTS.map((agentDef) => {
    const activeTask = agentTaskMap.get(agentDef.id);

    let status: Agent['status'];
    if (agentDef.id === 'percival') {
      // Percival está ok si heartbeat es reciente (< 60 min)
      status = heartbeatMinutesAgo < 60 ? 'idle' : 'error';
    } else {
      status = activeTask ? 'working' : 'idle';
    }

    return {
      id: agentDef.id,
      name: agentDef.name,
      status,
      currentTask: activeTask?.branch ?? null,
      model: agentDef.model,
      startedAt: activeTask?.startedAt ?? null,
    };
  });
}
