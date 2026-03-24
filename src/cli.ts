#!/usr/bin/env node
import 'dotenv/config';
import { Command } from 'commander';
import { loadConfig } from './core/config.js';
import { OrchestrationEngine } from './core/engine.js';

const program = new Command();

program
  .name('aigora')
  .description('Messenger-based autonomous AI multi-agent orchestration')
  .version('0.1.0');

// ---------------------------------------------------------------------------
// start
// ---------------------------------------------------------------------------

program
  .command('start')
  .description('Start the orchestration engine')
  .option('-c, --config <path>', 'Path to config file')
  .action(async (opts: { config?: string }) => {
    const config = loadConfig(opts.config);
    const engine = new OrchestrationEngine(config);

    process.on('SIGINT', async () => {
      console.log('\nReceived SIGINT, shutting down...');
      await engine.stop();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.log('\nReceived SIGTERM, shutting down...');
      await engine.stop();
      process.exit(0);
    });

    await engine.start();
    console.log('[aigora] Engine started. Press Ctrl+C to stop.');
  });

// ---------------------------------------------------------------------------
// stop
// ---------------------------------------------------------------------------

program
  .command('stop')
  .description('Send graceful shutdown signal (if running as daemon)')
  .action(() => {
    console.log('[aigora] Send SIGTERM to the running process to stop it gracefully.');
  });

// ---------------------------------------------------------------------------
// status
// ---------------------------------------------------------------------------

program
  .command('status')
  .description('Show running agents, current phase, and active tasks')
  .option('-c, --config <path>', 'Path to config file')
  .action((opts: { config?: string }) => {
    const config = loadConfig(opts.config);
    const engine = new OrchestrationEngine(config);
    const status = engine.getStatus();
    const registry = engine.getRegistry();
    const agents = registry.getAll();

    console.log('\n--- aigora status ---');
    console.log(`Running:       ${status.running}`);
    console.log(`Projects:      ${status.projectCount}`);
    console.log(`Agents:        ${status.agentCount}`);
    if (status.startedAt !== undefined) {
      console.log(`Started at:    ${status.startedAt.toISOString()}`);
    }

    if (agents.length > 0) {
      console.log('\nRegistered agents:');
      for (const agent of agents) {
        console.log(`  [${agent.role}] ${agent.name} (${agent.id}) — ${agent.status}`);
      }
    } else {
      console.log('\nNo agents registered.');
    }
  });

// ---------------------------------------------------------------------------
// submit
// ---------------------------------------------------------------------------

program
  .command('submit <agenda>')
  .description('Submit an agenda for agents to work on')
  .option('-c, --config <path>', 'Path to config file')
  .option('--channel <channel>', 'Target channel', 'default')
  .action(async (agenda: string, opts: { config?: string; channel: string }) => {
    const config = loadConfig(opts.config);
    const engine = new OrchestrationEngine(config);
    await engine.start();
    const projectId = await engine.submitAgenda(agenda, opts.channel);
    console.log(`[aigora] Agenda submitted. Project ID: ${projectId}`);
    await engine.stop();
  });

// ---------------------------------------------------------------------------
// config
// ---------------------------------------------------------------------------

program
  .command('config')
  .description('Show resolved configuration')
  .option('-c, --config <path>', 'Path to config file')
  .action((opts: { config?: string }) => {
    const config = loadConfig(opts.config);
    console.log('\n--- aigora config ---');
    console.log(JSON.stringify(config, null, 2));
  });

// ---------------------------------------------------------------------------
// agents
// ---------------------------------------------------------------------------

program
  .command('agents')
  .description('List registered agents and their status')
  .option('-c, --config <path>', 'Path to config file')
  .action((opts: { config?: string }) => {
    const config = loadConfig(opts.config);
    const engine = new OrchestrationEngine(config);
    const agents = engine.getRegistry().getAll();

    if (agents.length === 0) {
      console.log('[aigora] No agents registered.');
      return;
    }

    console.log('\n--- registered agents ---');
    for (const agent of agents) {
      console.log(
        `  ${agent.id}  role=${agent.role}  name=${agent.name}  status=${agent.status}  model=${agent.model}`,
      );
    }
  });

program.parse(process.argv);
