export type InterceptSeverity = 'info' | 'warn' | 'block';

export interface InterceptResult {
  allowed: boolean;
  severity: InterceptSeverity;
  reason?: string;
  matchedPattern?: string;
}

interface CommandRule {
  pattern: RegExp;
  severity: InterceptSeverity;
  reason: string;
}

const BLOCKED_RULES: CommandRule[] = [
  {
    pattern: /\brm\s+(-[a-zA-Z]*f[a-zA-Z]*\s+)?-[a-zA-Z]*r[a-zA-Z]*\s/i,
    severity: 'block',
    reason: 'Recursive delete is not allowed',
  },
  {
    pattern: /\brm\s+.*--no-preserve-root/i,
    severity: 'block',
    reason: 'Dangerous rm flag not allowed',
  },
  {
    pattern: /\bDROP\s+(TABLE|DATABASE|SCHEMA)\b/i,
    severity: 'block',
    reason: 'Destructive SQL DROP statements are not allowed',
  },
  {
    pattern: /\bformat\s+[a-zA-Z]:[\\\/]/i,
    severity: 'block',
    reason: 'Disk format commands are not allowed',
  },
  {
    pattern: /\bmkfs\b/i,
    severity: 'block',
    reason: 'Filesystem creation commands are not allowed',
  },
  {
    pattern: /\bdd\s+.*of=\/dev\//i,
    severity: 'block',
    reason: 'Direct disk writes via dd are not allowed',
  },
  {
    pattern: /\b(shutdown|reboot|poweroff|halt)\b/i,
    severity: 'block',
    reason: 'System power commands are not allowed',
  },
  {
    pattern: /\bchmod\s+777\b/i,
    severity: 'block',
    reason: 'chmod 777 grants world-writable permissions and is not allowed',
  },
  {
    pattern: /\bchmod\s+-R\s+777\b/i,
    severity: 'block',
    reason: 'Recursive chmod 777 is not allowed',
  },
  {
    pattern: />\s*\/dev\/sd[a-z]/i,
    severity: 'block',
    reason: 'Writing directly to block devices is not allowed',
  },
  {
    pattern: /:\(\)\s*\{.*:\|:&\s*\};:/,
    severity: 'block',
    reason: 'Fork bomb pattern detected',
  },
];

const WARN_RULES: CommandRule[] = [
  {
    pattern: /\bgit\s+push\s+.*--force\b/i,
    severity: 'warn',
    reason: 'Force push can overwrite remote history',
  },
  {
    pattern: /\bnpm\s+publish\b/i,
    severity: 'warn',
    reason: 'Publishing to npm registry — confirm intentional',
  },
  {
    pattern: /\bdocker\s+rm\b/i,
    severity: 'warn',
    reason: 'Removing Docker containers — confirm intentional',
  },
  {
    pattern: /\bdocker\s+rmi\b/i,
    severity: 'warn',
    reason: 'Removing Docker images — confirm intentional',
  },
  {
    pattern: /\bgit\s+reset\s+--hard\b/i,
    severity: 'warn',
    reason: 'Hard git reset discards uncommitted changes',
  },
  {
    pattern: /\btruncate\b/i,
    severity: 'warn',
    reason: 'TRUNCATE will delete all table rows',
  },
];

export class CommandInterceptor {
  intercept(command: string): InterceptResult {
    // Check block rules first
    for (const rule of BLOCKED_RULES) {
      if (rule.pattern.test(command)) {
        return {
          allowed: false,
          severity: 'block',
          reason: rule.reason,
          matchedPattern: rule.pattern.toString(),
        };
      }
    }

    // Check warn rules
    for (const rule of WARN_RULES) {
      if (rule.pattern.test(command)) {
        return {
          allowed: true,
          severity: 'warn',
          reason: rule.reason,
          matchedPattern: rule.pattern.toString(),
        };
      }
    }

    return { allowed: true, severity: 'info' };
  }
}
