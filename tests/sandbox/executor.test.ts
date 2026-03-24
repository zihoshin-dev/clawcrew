import { describe, it, expect } from 'vitest';
import { SandboxExecutor } from '../../src/sandbox/executor.js';

describe('SandboxExecutor', () => {
  const executor = new SandboxExecutor();

  describe('successful execution', () => {
    it('captures stdout of a simple echo command', async () => {
      const result = await executor.execute('echo "hello sandbox"');
      expect(result.stdout.trim()).toBe('hello sandbox');
      expect(result.exitCode).toBe(0);
    });

    it('reports zero exit code for a successful command', async () => {
      const result = await executor.execute('true');
      expect(result.exitCode).toBe(0);
    });

    it('captures stderr separately from stdout', async () => {
      const result = await executor.execute('echo "err" >&2');
      expect(result.stderr.trim()).toBe('err');
      expect(result.stdout).toBe('');
    });

    it('records a positive duration in milliseconds', async () => {
      const result = await executor.execute('echo "timing"');
      expect(result.duration).toBeGreaterThan(0);
    });
  });

  describe('failed commands', () => {
    it('returns a non-zero exit code for a failing command', async () => {
      const result = await executor.execute('exit 1', { timeout: 5000, cwd: process.cwd() });
      expect(result.exitCode).not.toBe(0);
    });

    it('captures stderr output from a command that writes to stderr', async () => {
      const result = await executor.execute('ls /this-path-does-not-exist-clawcrew-test');
      expect(result.stderr.length).toBeGreaterThan(0);
    });
  });

  describe('timeout enforcement', () => {
    it('kills a process that exceeds the timeout and returns exit code 124', async () => {
      const result = await executor.execute('sleep 60', { timeout: 100, cwd: process.cwd() });
      expect(result.exitCode).toBe(124);
    }, 5000);

    it('includes a timeout message in stderr when the process is killed', async () => {
      const result = await executor.execute('sleep 60', { timeout: 100, cwd: process.cwd() });
      expect(result.stderr).toMatch(/timeout/i);
    }, 5000);
  });

  describe('environment variables', () => {
    it('injects custom environment variables into the subprocess', async () => {
      const result = await executor.execute('echo $MY_VAR', {
        timeout: 5000,
        cwd: process.cwd(),
        env: { MY_VAR: 'injected-value' },
      });
      expect(result.stdout.trim()).toBe('injected-value');
    });
  });
});
