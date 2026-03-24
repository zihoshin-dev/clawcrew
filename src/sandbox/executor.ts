import { spawn } from 'child_process';
import { CommandInterceptor } from './interceptor.js';

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
const MAX_OUTPUT_BYTES = 10 * 1024 * 1024; // 10 MB

const SECRET_ENV_KEYS = [
  'ANTHROPIC_API_KEY',
  'OPENAI_API_KEY',
  'GOOGLE_API_KEY',
  'GOOGLE_AI_API_KEY',
  'SLACK_BOT_TOKEN',
  'SLACK_SIGNING_SECRET',
  'SLACK_APP_TOKEN',
  'TELEGRAM_BOT_TOKEN',
];

function stripSecrets(env: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const safe = { ...env };
  for (const key of SECRET_ENV_KEYS) {
    delete safe[key];
  }
  return safe;
}

export class SandboxExecutor {
  private readonly interceptor = new CommandInterceptor();

  async execute(command: string, options?: Partial<ExecOptions>): Promise<ExecResult> {
    // Pre-check: intercept dangerous commands
    const check = this.interceptor.intercept(command);
    if (!check.allowed) {
      return {
        stdout: '',
        stderr: `BLOCKED: ${check.reason ?? 'Command not permitted'}`,
        exitCode: 126,
        duration: 0,
      };
    }

    const timeout = options?.timeout ?? DEFAULT_TIMEOUT_MS;
    const cwd = options?.cwd ?? DEFAULT_CWD;
    const baseEnv = stripSecrets(process.env);
    const env = options?.env !== undefined ? { ...baseEnv, ...options.env } : baseEnv;

    const startedAt = Date.now();

    return new Promise<ExecResult>((resolve) => {
      let timedOut = false;
      let outputLimitExceeded = false;
      let totalOutputBytes = 0;
      const stdoutChunks: Buffer[] = [];
      const stderrChunks: Buffer[] = [];

      const child = spawn('sh', ['-c', command], {
        cwd,
        env: env as NodeJS.ProcessEnv,
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      child.stdout.on('data', (chunk: Buffer) => {
        totalOutputBytes += chunk.length;
        if (totalOutputBytes > MAX_OUTPUT_BYTES) {
          outputLimitExceeded = true;
          child.kill('SIGKILL');
          return;
        }
        stdoutChunks.push(chunk);
      });

      child.stderr.on('data', (chunk: Buffer) => {
        totalOutputBytes += chunk.length;
        if (totalOutputBytes > MAX_OUTPUT_BYTES) {
          outputLimitExceeded = true;
          child.kill('SIGKILL');
          return;
        }
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

        let stderr: string;
        if (timedOut) {
          stderr = `Process killed after ${timeout}ms timeout`;
        } else if (outputLimitExceeded) {
          stderr = `Process killed: output exceeded ${MAX_OUTPUT_BYTES} byte limit`;
        } else {
          stderr = Buffer.concat(stderrChunks).toString('utf-8');
        }

        resolve({
          stdout,
          stderr,
          exitCode: timedOut || outputLimitExceeded ? 124 : (code ?? 1),
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
