import { AgentRole } from '../core/types.js';

export type ValidationSeverity = 'info' | 'warn' | 'block';

export interface ValidationResult {
  allowed: boolean;
  reason?: string;
  severity: ValidationSeverity;
}

export interface PolicyRule {
  id: string;
  pattern: string;
  severity: ValidationSeverity;
  reason: string;
  roles?: AgentRole[]; // if undefined, applies to all roles
}

export interface PolicySet {
  rules: PolicyRule[];
  rolePermissions?: Partial<Record<AgentRole, { allowedPatterns?: string[]; blockedPatterns?: string[] }>>;
}

export class PolicyEngine {
  private readonly policies: PolicySet;
  private readonly compiledRules: Array<{ rule: PolicyRule; regex: RegExp }>;

  constructor(policies: PolicySet) {
    this.policies = policies;
    this.compiledRules = policies.rules.map((rule) => ({
      rule,
      regex: new RegExp(rule.pattern, 'i'),
    }));
  }

  validate(command: string, agentRole: AgentRole): ValidationResult {
    // Check role-specific blocked patterns first
    const rolePerms = this.policies.rolePermissions?.[agentRole];
    if (rolePerms?.blockedPatterns !== undefined) {
      for (const pattern of rolePerms.blockedPatterns) {
        if (new RegExp(pattern, 'i').test(command)) {
          return {
            allowed: false,
            severity: 'block',
            reason: `Command blocked by role policy for ${agentRole}`,
          };
        }
      }
    }

    // Check role-specific allowed patterns (whitelist)
    if (rolePerms?.allowedPatterns !== undefined && rolePerms.allowedPatterns.length > 0) {
      const isAllowed = rolePerms.allowedPatterns.some((pattern) =>
        new RegExp(pattern, 'i').test(command),
      );
      if (!isAllowed) {
        return {
          allowed: false,
          severity: 'block',
          reason: `Command not in allowed patterns for role ${agentRole}`,
        };
      }
    }

    // Check global rules
    for (const { rule, regex } of this.compiledRules) {
      // Skip rules scoped to other roles
      if (rule.roles !== undefined && !rule.roles.includes(agentRole)) {
        continue;
      }

      if (regex.test(command)) {
        return {
          allowed: rule.severity !== 'block',
          severity: rule.severity,
          reason: rule.reason,
        };
      }
    }

    return { allowed: true, severity: 'info' };
  }

  getRules(): PolicyRule[] {
    return [...this.policies.rules];
  }
}
