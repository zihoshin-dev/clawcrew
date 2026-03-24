import { spawn } from 'child_process';

export interface ExecOptions {
  timeout: number;
  maxMemory?: number;
  cwd: string;
  env?: Record<string, string>;
}

export interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  duration: number;
}

const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_CWD = process.cwd();

export class SandboxExecutor {
  async execute(command: string, options?: Partial<ExecOptions>): Promise<ExecResult> {
    const timeout = options?.timeout ?? DEFAULT_TIMEOUT_MS;
    const cwd = options?.cwd ?? DEFAULT_CWD;
    const env = options?.env !== undefined ? { ...process.env, ...options.env } : process.env;

    const startedAt = Date.now();

    return new Promise<ExecResult>((resolve) => {
      let timedOut = false;
      const stdoutChunks: Buffer[] = [];
      const stderrChunks: Buffer[] = [];

      const child = spawn('sh', ['-c', command], {
        cwd,
        env: env as NodeJS.ProcessEnv,
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      child.stdout.on('data', (chunk: Buffer) => {
        stdoutChunks.push(chunk);
      });

      child.stderr.on('data', (chunk: Buffer) => {
        stderrChunks.push(chunk);
      });

      const timer = setTimeout(() => {
        timedOut = true;
        child.kill('SIGKILL');
      }, timeout);

      child.on('close', (code) => {
        clearTimeout(timer);
        const duration = Date.now() - startedAt;
        const stdout = Buffer.concat(stdoutChunks).toString('utf-8');
        const stderr = timedOut
          ? `Process killed after ${timeout}ms timeout`
          : Buffer.concat(stderrChunks).toString('utf-8');

        resolve({
          stdout,
          stderr,
          exitCode: timedOut ? 124 : (code ?? 1),
          duration,
        });
      });

      child.on('error', (err) => {
        clearTimeout(timer);
        resolve({
          stdout: '',
          stderr: err.message,
          exitCode: 1,
          duration: Date.now() - startedAt,
        });
      });
    });
  }
}
