import type { Tool } from './types.js';

export class ToolRegistry {
  private readonly tools = new Map<string, Tool>();

  register(tool: Tool): void {
    this.tools.set(tool.name, tool);
  }

  unregister(name: string): void {
    this.tools.delete(name);
  }

  get(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  list(): Tool[] {
    return Array.from(this.tools.values());
  }

  getByPermission(permission: string): Tool[] {
    return this.list().filter(
      (tool) =>
        tool.requiredPermissions !== undefined &&
        tool.requiredPermissions.includes(permission),
    );
  }
}
