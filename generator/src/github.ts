import { execSync } from 'child_process';
import { GhPR, PullRequest, Stats } from './types';

function mapCiStatus(pr: GhPR): PullRequest['ci'] {
  if (!pr.statusCheckRollup || pr.statusCheckRollup.length === 0) return 'none';

  const states = pr.statusCheckRollup.map((s) => {
    // CheckRun tiene conclusion, StatusContext tiene state
    const val = s.conclusion ?? s.state ?? '';
    return val.toUpperCase();
  });

  if (states.includes('FAILURE') || states.includes('ERROR')) return 'failing';
  if (states.includes('PENDING') || states.includes('IN_PROGRESS') || states.includes('QUEUED')) return 'pending';
  if (states.every((s) => s === 'SUCCESS')) return 'passing';

  return 'none';
}

function mapReviewStatus(pr: GhPR): PullRequest['reviews'] {
  if (!pr.reviews || pr.reviews.length === 0) return 'none';

  const states = pr.reviews.map((r) => r.state.toUpperCase());

  if (states.includes('APPROVED')) return 'approved';
  if (states.includes('CHANGES_REQUESTED')) return 'changes-requested';

  return 'pending';
}

function mapPrStatus(state: string): PullRequest['status'] {
  switch (state.toUpperCase()) {
    case 'OPEN': return 'open';
    case 'MERGED': return 'merged';
    case 'CLOSED': return 'closed';
    default: return 'closed';
  }
}

function fetchPRsFromRepo(repo: string): GhPR[] {
  try {
    const output = execSync(
      `gh pr list --repo ${repo} --state all --json number,title,state,statusCheckRollup,reviews,author,createdAt,url --limit 20`,
      { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
    );
    return JSON.parse(output) as GhPR[];
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.warn(`⚠️  No se pudieron obtener PRs de ${repo}: ${errMsg.split('\n')[0]}`);
    return [];
  }
}

export function fetchAllPRs(repos: string[]): PullRequest[] {
  const allPRs: PullRequest[] = [];

  for (const repo of repos) {
    const repoName = repo.split('/').pop() ?? repo;
    console.log(`  📡 Consultando PRs de ${repo}...`);
    const ghPRs = fetchPRsFromRepo(repo);

    for (const pr of ghPRs) {
      allPRs.push({
        number: pr.number,
        title: pr.title,
        repo: repoName,
        url: pr.url,
        status: mapPrStatus(pr.state),
        ci: mapCiStatus(pr),
        reviews: mapReviewStatus(pr),
        author: pr.author?.login ?? 'unknown',
        createdAt: pr.createdAt,
      });
    }
  }

  return allPRs;
}

export function computePrStats(
  pullRequests: PullRequest[],
  existing: Partial<Stats> = {}
): Pick<Stats, 'prsToday' | 'prsThisWeek'> {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart);
  weekStart.setDate(todayStart.getDate() - todayStart.getDay());

  let prsToday = 0;
  let prsThisWeek = 0;

  for (const pr of pullRequests) {
    const created = new Date(pr.createdAt);
    if (created >= todayStart) prsToday++;
    if (created >= weekStart) prsThisWeek++;
  }

  return { prsToday, prsThisWeek };
}
