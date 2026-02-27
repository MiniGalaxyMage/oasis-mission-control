import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import minimist from 'minimist';

import { fetchAllPRs } from './github';
import { readActiveTasks, readCompletedTasks, buildTaskList, buildAgentList } from './clawdbot';
import { readHeartbeat } from './heartbeat';
import { buildSnapshot } from './snapshot';
import { CliOptions } from './types';

function expandHome(p: string): string {
  if (p.startsWith('~/')) {
    return path.join(os.homedir(), p.slice(2));
  }
  return p;
}

function parseOptions(): CliOptions {
  const argv = minimist(process.argv.slice(2), {
    string: ['output', 'repos', 'local-repos'],
    boolean: ['pretty'],
    default: {
      output: path.resolve(__dirname, '../../data/snapshot.json'),
      repos: 'CarlosDez23/JISBACK,CarlosDez23/jis-test-prep,MiniGalaxyMage/oasis-mission-control',
      'local-repos': '~/dev/fdd/JISBACK,~/dev/fdd/jis-test-prep,~/dev/fdd/oasis-mission-control',
      pretty: true,
    },
  });

  return {
    output: expandHome(argv['output'] as string),
    repos: (argv['repos'] as string).split(',').map((r) => r.trim()),
    localRepos: (argv['local-repos'] as string).split(',').map((r) => r.trim()),
    pretty: argv['pretty'] as boolean,
  };
}

async function main(): Promise<void> {
  console.log('🚀 Oasis Mission Control — Generador de Snapshot');
  console.log('='.repeat(50));

  const options = parseOptions();

  console.log(`\n📋 Repos monitorizados: ${options.repos.join(', ')}`);
  console.log(`📁 Repos locales: ${options.localRepos.join(', ')}`);
  console.log(`💾 Salida: ${options.output}\n`);

  // 1. Leer heartbeat
  console.log('💓 Leyendo estado del heartbeat...');
  const heartbeat = readHeartbeat();
  console.log(`  → Status: ${heartbeat.status} (hace ${heartbeat.minutesAgo} min)\n`);

  // 2. Leer tareas activas y completadas
  console.log('📂 Leyendo tareas locales (.clawdbot/)...');
  const activeTasks = readActiveTasks(options.localRepos);
  const completedTasks = readCompletedTasks(options.localRepos);
  console.log(`  → ${activeTasks.length} tarea(s) activa(s), ${completedTasks.length} completada(s)\n`);

  // 3. Construir lista de agentes
  const agents = buildAgentList(activeTasks, heartbeat.minutesAgo);
  const tasks = buildTaskList(activeTasks);

  // 4. Consultar PRs de GitHub
  console.log('📡 Consultando GitHub PRs...');
  const pullRequests = fetchAllPRs(options.repos);
  console.log(`  → ${pullRequests.length} PR(s) encontrado(s)\n`);

  // 5. Ensamblar snapshot
  console.log('🔧 Ensamblando snapshot...');
  const snapshot = buildSnapshot({
    agents,
    tasks,
    pullRequests,
    completedTasksCount: completedTasks.length,
    heartbeat,
    lastDeployAt: null,
  });

  // 6. Escribir a disco
  const outputDir = path.dirname(options.output);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const json = options.pretty
    ? JSON.stringify(snapshot, null, 2)
    : JSON.stringify(snapshot);

  fs.writeFileSync(options.output, json, 'utf-8');

  console.log(`\n✅ Snapshot generado en: ${options.output}`);
  console.log(`   → ${snapshot.agents.length} agente(s)`);
  console.log(`   → ${snapshot.tasks.length} tarea(s)`);
  console.log(`   → ${snapshot.pullRequests.length} PR(s)`);
  console.log(`   → Agentes activos: ${snapshot.stats.agentsActive}`);
}

main().catch((err) => {
  console.error('❌ Error generando snapshot:', err);
  process.exit(1);
});
