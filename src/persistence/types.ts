import type { Project } from '../core/types.js';

export type { Project };

export interface CostEntry {
  id: string;
  projectId: string;
  agentId: string;
  model: string;
  provider: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cost: number;
  recordedAt: Date;
}

export interface ProjectStore {
  saveProject(project: Project): void;
  getProject(id: string): Project | undefined;
  getAllProjects(): Project[];
  deleteProject(id: string): void;
}
