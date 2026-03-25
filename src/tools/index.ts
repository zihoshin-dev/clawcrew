export type { Tool, ToolInput, ToolOutput } from './types.js';
export { ToolRegistry } from './registry.js';
export { webSearchTool } from './builtin/web-search.js';
export { codeExecTool } from './builtin/code-exec.js';
export { fileReadTool } from './builtin/file-read.js';

import { ToolRegistry } from './registry.js';
import { webSearchTool } from './builtin/web-search.js';
import { codeExecTool } from './builtin/code-exec.js';
import { fileReadTool } from './builtin/file-read.js';

export function createDefaultRegistry(): ToolRegistry {
  const registry = new ToolRegistry();
  registry.register(webSearchTool);
  registry.register(codeExecTool);
  registry.register(fileReadTool);
  return registry;
}
