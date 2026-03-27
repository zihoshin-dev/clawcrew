#!/usr/bin/env node
import 'dotenv/config';
import { existsSync, readFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { Command } from 'commander';
import { loadConfig } from './core/config.js';
import { OrchestrationEngine } from './core/engine.js';
import { RunMode, RunStatus } from './core/types.js';
import { SqliteProjectStore } from './persistence/sqlite-store.js';
import { CostReporter } from './dashboard/cost-reporter.js';
import { formatRunSummary } from './core/runtime.js';
import { createGitHubWebhookRunRequest } from './integrations/github-webhook.js';

const program = new Command();
const DEFAULT_DB_PATH = `${process.env['DATA_DIR'] ?? './data'}/clawcrew.db`;
const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

program
  .name('clawcrew')
  .description('Durable, review-first AI agent runtime with messenger steering')
  .version('0.1.0');

program
  .command('start')
  .description('Start the orchestration engine as a long-running worker')
  .option('-c, --config <path>', 'Path to config file')
  .action(async (opts: { config?: string }) => {
    const config = loadConfig(opts.config);
    const store = new SqliteProjectStore(DEFAULT_DB_PATH);
    const engine = new OrchestrationEngine(config, store);

    const shutdown = async () => {
      await engine.stop();
      process.exit(0);
    };

    process.on('SIGINT', () => void shutdown());
    process.on('SIGTERM', () => void shutdown());

    await engine.start();
    console.log('[clawcrew] Engine started. Press Ctrl+C to stop.');
    const keepalive = setInterval(() => {}, 60_000);
    process.on('beforeExit', () => clearInterval(keepalive));
  });

program
  .command('run <agenda>')
  .description('Run an agenda locally using the durable runtime')
  .option('-c, --config <path>', 'Path to config file')
  .option('--channel <channel>', 'Target channel or logical local channel', 'local')
  .option('--mode <mode>', 'Execution mode: solo|review|full', RunMode.REVIEW)
  .action(async (agenda: string, opts: { config?: string; channel: string; mode: RunMode }) => {
    const config = loadConfig(opts.config);
    const store = new SqliteProjectStore(DEFAULT_DB_PATH);
    const engine = new OrchestrationEngine(config, store);
    await engine.start();

    try {
      const run = await engine.submitRun(agenda, opts.channel, { mode: parseMode(opts.mode) });
      await waitForRun(engine, run.id);
    } finally {
      await engine.stop();
    }
  });

program
  .command('submit <agenda>')
  .description('Alias for run')
  .option('-c, --config <path>', 'Path to config file')
  .option('--channel <channel>', 'Target channel or logical local channel', 'local')
  .option('--mode <mode>', 'Execution mode: solo|review|full', RunMode.REVIEW)
  .action(async (agenda: string, opts: { config?: string; channel: string; mode: RunMode }) => {
    const config = loadConfig(opts.config);
    const store = new SqliteProjectStore(DEFAULT_DB_PATH);
    const engine = new OrchestrationEngine(config, store);
    await engine.start();

    try {
      const run = await engine.submitRun(agenda, opts.channel, { mode: parseMode(opts.mode) });
      console.log(`[clawcrew] Submitted run ${run.id} for project ${run.projectId}`);
      await waitForRun(engine, run.id);
    } finally {
      await engine.stop();
    }
  });

program
  .command('approve <approvalId>')
  .description('Approve a pending approval request and resume the associated run')
  .option('-c, --config <path>', 'Path to config file')
  .option('--by <user>', 'Approver identity', 'cli-user')
  .option('--comment <comment>', 'Optional comment')
  .option('--reject', 'Reject instead of approving')
  .action(async (approvalId: string, opts: { config?: string; by: string; comment?: string; reject?: boolean }) => {
    const config = loadConfig(opts.config);
    const store = new SqliteProjectStore(DEFAULT_DB_PATH);
    const engine = new OrchestrationEngine(config, store);
    await engine.start();

    try {
      const approval = await engine.approveRun(approvalId, !opts.reject, opts.by, opts.comment);
      if (approval === undefined) {
        console.error(`[clawcrew] Unknown approval request: ${approvalId}`);
        process.exitCode = 1;
        return;
      }
      console.log(`[clawcrew] ${opts.reject ? 'Rejected' : 'Approved'} ${approval.id}`);
      await waitForRun(engine, approval.runId);
    } finally {
      await engine.stop();
    }
  });

program
  .command('status')
  .description('Show a persisted run summary or list all runs')
  .option('--run <id>', 'Specific run id')
  .option('--project <id>', 'Filter runs by project id')
  .action((opts: { run?: string; project?: string }) => {
    const store = new SqliteProjectStore(DEFAULT_DB_PATH);
    const engine = new OrchestrationEngine(loadConfig(), store);

    if (opts.run !== undefined) {
      const summary = engine.getRunSummary(opts.run);
      if (summary === undefined) {
        console.log(`[clawcrew] No run found for ${opts.run}`);
      } else {
        console.log(formatRunSummary(summary));
      }
      store.close();
      return;
    }

    const runs = engine.listRunSummaries().filter((summary) => opts.project === undefined || summary.run.projectId === opts.project);
    if (runs.length === 0) {
      console.log('[clawcrew] No runs found.');
      store.close();
      return;
    }

    for (const summary of runs) {
      console.log(formatRunSummary(summary));
      console.log('');
    }
    store.close();
  });

program
  .command('watch <runId>')
  .description('Poll a run summary until it reaches a stable state')
  .option('-c, --config <path>', 'Path to config file')
  .action(async (runId: string, opts: { config?: string }) => {
    const config = loadConfig(opts.config);
    const store = new SqliteProjectStore(DEFAULT_DB_PATH);
    const engine = new OrchestrationEngine(config, store);
    await engine.start();

    try {
      await waitForRun(engine, runId);
    } finally {
      await engine.stop();
    }
  });

program
  .command('config')
  .description('Show resolved configuration')
  .option('-c, --config <path>', 'Path to config file')
  .action((opts: { config?: string }) => {
    const config = loadConfig(opts.config);
    console.log(JSON.stringify(config, null, 2));
  });

program
  .command('agents')
  .description('List registered agents currently known to a fresh engine instance')
  .option('-c, --config <path>', 'Path to config file')
  .action((opts: { config?: string }) => {
    const config = loadConfig(opts.config);
    const engine = new OrchestrationEngine(config);
    const agents = engine.getRegistry().getAll();
    if (agents.length === 0) {
      console.log('[clawcrew] No agents registered.');
      return;
    }
    for (const agent of agents) {
      console.log(`${agent.id} role=${agent.role} name=${agent.name} status=${agent.status} model=${agent.model}`);
    }
  });

program
  .command('cost')
  .description('Show persisted cost report for all projects, a project, or a run')
  .option('-p, --project <id>', 'Filter by project ID')
  .option('-r, --run <id>', 'Filter by run ID')
  .action((opts: { project?: string; run?: string }) => {
    const store = new SqliteProjectStore(DEFAULT_DB_PATH);
    const reporter = new CostReporter(store);
    const report = reporter.generateReport(opts.project, opts.run);
    console.log(reporter.formatForCli(report));
    store.close();
  });

program
  .command('webhook <provider>')
  .description('Create a run from a supported webhook payload')
  .option('-c, --config <path>', 'Path to config file')
  .option('--event <event>', 'Webhook event name')
  .option('--payload <path>', 'Path to a JSON payload file')
  .option('--mode <mode>', 'Execution mode: solo|review|full', RunMode.REVIEW)
  .action(async (provider: string, opts: { config?: string; event?: string; payload?: string; mode: RunMode }) => {
    if (provider !== 'github') {
      console.error(`[clawcrew] Unsupported webhook provider: ${provider}`);
      process.exitCode = 1;
      return;
    }
    if (opts.event === undefined || opts.payload === undefined) {
      console.error('[clawcrew] --event and --payload are required for webhook ingestion.');
      process.exitCode = 1;
      return;
    }

    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(readFileSync(resolvePayloadPath(opts.payload), 'utf-8')) as Record<string, unknown>;
    } catch (error) {
      console.error(`[clawcrew] Invalid webhook payload: ${error instanceof Error ? error.message : String(error)}`);
      process.exitCode = 1;
      return;
    }

    const request = createGitHubWebhookRunRequest({
      event: opts.event,
      payload,
      mode: parseMode(opts.mode),
    });

    const config = loadConfig(opts.config);
    const store = new SqliteProjectStore(DEFAULT_DB_PATH);
    const engine = new OrchestrationEngine(config, store);
    await engine.start();

    try {
      const run = await engine.submitRun(request.agenda, request.channel, request.options);
      console.log(`[clawcrew] Accepted ${provider} webhook event ${opts.event} into run ${run.id}`);
      await waitForRun(engine, run.id);
    } finally {
      await engine.stop();
    }
  });

program.parse(process.argv);

async function waitForRun(engine: OrchestrationEngine, runId: string): Promise<void> {
  let lastSnapshot = '';

  for (;;) {
    const summary = engine.getRunSummary(runId);
    if (summary === undefined) {
      console.log(`[clawcrew] Run not found: ${runId}`);
      return;
    }

    const snapshot = formatRunSummary(summary);
    if (snapshot !== lastSnapshot) {
      console.log(snapshot);
      console.log('');
      lastSnapshot = snapshot;
    }

    if (
      summary.run.status === RunStatus.WAITING_APPROVAL ||
      summary.run.status === RunStatus.COMPLETED ||
      summary.run.status === RunStatus.FAILED ||
      summary.run.status === RunStatus.CANCELLED
    ) {
      if (summary.pendingApproval !== undefined) {
        console.log(`Use: clawcrew approve ${summary.pendingApproval.id}`);
      }
      return;
    }

    await sleep(300);
  }
}

function parseMode(mode: string): RunMode {
  switch (mode) {
    case RunMode.SOLO:
      return RunMode.SOLO;
    case RunMode.FULL:
      return RunMode.FULL;
    case RunMode.REVIEW:
    default:
      return RunMode.REVIEW;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function resolvePayloadPath(payloadPath: string): string {
  const candidate = resolve(process.cwd(), payloadPath);
  if (existsSync(candidate)) {
    return candidate;
  }

  const packaged = resolve(PACKAGE_ROOT, payloadPath);
  if (existsSync(packaged)) {
    return packaged;
  }

  return candidate;
}
