import { describe, it, expect, afterEach } from 'vitest';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const execFileAsync = promisify(execFile);
const CLI_CWD = '/Users/ziho/Desktop/ziho_dev/clawcrew';

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe('clawcrew CLI', () => {
  it('prints no runs found for a fresh data directory', async () => {
    const dataDir = makeTempDataDir();
    const result = await runCli(['status'], dataDir);
    expect(result.stdout).toContain('No runs found');
  });

  it('creates a review-mode run that pauses for approval and can be resumed', async () => {
    const dataDir = makeTempDataDir();
    const runResult = await runCli(['run', 'cli review test', '--mode', 'review', '--channel', 'local'], dataDir);
    expect(runResult.stdout).toContain('Status: waiting_approval');

    const approvalId = runResult.stdout.match(/Use: clawcrew approve ([A-Za-z0-9_-]+)/)?.[1];
    expect(approvalId).toBeDefined();

    const approveResult = await runCli(['approve', approvalId!], dataDir);
    expect(approveResult.stdout).toContain('Status: completed');
  });
});

function makeTempDataDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'clawcrew-cli-'));
  tempDirs.push(dir);
  return dir;
}

async function runCli(args: string[], dataDir: string): Promise<{ stdout: string; stderr: string }> {
  return execFileAsync('npx', ['tsx', 'src/cli.ts', ...args], {
    cwd: CLI_CWD,
    env: { ...process.env, DATA_DIR: dataDir },
  });
}
