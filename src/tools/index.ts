export type { Tool, ToolInput, ToolOutput } from './types.js';
export { ToolRegistry } from './registry.js';
export { webSearchTool } from './builtin/web-search.js';
export { codeExecTool } from './builtin/code-exec.js';
export { fileReadTool } from './builtin/file-read.js';
export { directoryListTool } from './builtin/directory-list.js';
export { gitStatusTool } from './builtin/git-status.js';

import { ToolRegistry } from './registry.js';
import { webSearchTool } from './builtin/web-search.js';
import { codeExecTool } from './builtin/code-exec.js';
import { fileReadTool } from './builtin/file-read.js';
import { directoryListTool } from './builtin/directory-list.js';
import { gitStatusTool } from './builtin/git-status.js';

export function createDefaultRegistry(): ToolRegistry {
  const registry = new ToolRegistry();
  registry.register(webSearchTool);
  registry.register(codeExecTool);
  registry.register(fileReadTool);
  registry.register(directoryListTool);
  registry.register(gitStatusTool);
  return registry;
}
