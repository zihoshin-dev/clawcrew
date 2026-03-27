import { describe, it, expect, afterEach } from 'vitest';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const execFileAsync = promisify(execFile);
const CLI_CWD = '/Users/ziho/Desktop/ziho_dev/clawcrew';
const CLI_ENTRY = join(CLI_CWD, 'src/cli.ts');

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

  it('accepts a github webhook payload through the shared runtime intake', async () => {
    const dataDir = makeTempDataDir();
    const payloadPath = join(dataDir, 'pull_request.opened.json');
    writeFileSync(payloadPath, JSON.stringify({
      action: 'opened',
      repository: { full_name: 'acme/clawcrew' },
      sender: { login: 'ziho' },
      pull_request: { title: 'Add runtime webhook trigger', number: 9 },
    }), 'utf-8');

    const result = await runCli(['webhook', 'github', '--event', 'pull_request', '--payload', payloadPath], dataDir);
    expect(result.stdout).toContain('Accepted github webhook event pull_request');
    expect(result.stdout).toContain('Status: waiting_approval');
    expect(result.stdout).toContain('github:acme/clawcrew');
  });

  it('resolves bundled example payloads outside the package root', async () => {
    const dataDir = makeTempDataDir();
    const outsideCwd = makeTempDataDir();
    const result = await runCli(
      ['webhook', 'github', '--event', 'pull_request', '--payload', 'examples/github/pull_request.opened.json'],
      dataDir,
      outsideCwd,
    );

    expect(result.stdout).toContain('Accepted github webhook event pull_request');
    expect(result.stdout).toContain('github:acme/clawcrew');
  });

  it('fails cleanly for an invalid webhook payload file', async () => {
    const dataDir = makeTempDataDir();
    const payloadPath = join(dataDir, 'broken.json');
    writeFileSync(payloadPath, '{not-json', 'utf-8');

    await expect(runCli(['webhook', 'github', '--event', 'pull_request', '--payload', payloadPath], dataDir)).rejects.toMatchObject({
      stderr: expect.stringContaining('Invalid webhook payload'),
    });
  });
});

function makeTempDataDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'clawcrew-cli-'));
  tempDirs.push(dir);
  return dir;
}

async function runCli(args: string[], dataDir: string, cwd = CLI_CWD): Promise<{ stdout: string; stderr: string }> {
  return execFileAsync('npx', ['tsx', CLI_ENTRY, ...args], {
    cwd,
    env: { ...process.env, DATA_DIR: dataDir },
  });
}
