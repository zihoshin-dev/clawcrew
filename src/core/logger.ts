import pino from 'pino';

export type Logger = pino.Logger;

export function createLogger(name: string, level: string = 'info'): Logger {
  return pino({ name, level });
}
