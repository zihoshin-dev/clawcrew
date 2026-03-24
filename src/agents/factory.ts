import { AgentRole } from '../core/types.js';
import type { BaseAgent } from './base.js';
import { ResearcherAgent } from './roles/researcher.js';
import { ArchitectAgent } from './roles/architect.js';
import { DeveloperAgent } from './roles/developer.js';
import { CriticAgent } from './roles/critic.js';
import { PMAgent } from './roles/pm.js';
import { QAAgent } from './roles/qa.js';
import { SecurityAgent } from './roles/security.js';
import { DesignerAgent } from './roles/designer.js';
import { AnalystAgent } from './roles/analyst.js';
import { MediatorAgent } from './roles/mediator.js';
import { DevOpsAgent } from './roles/devops.js';
import { ScrumMasterAgent } from './roles/scrum-master.js';
import { JudgeAgent } from './roles/judge.js';
import { RetrospectiveAgent } from './roles/retrospective.js';
import { VisionaryAgent } from './roles/visionary.js';
import { InnovatorAgent } from './roles/innovator.js';
import { StrategistAgent } from './roles/strategist.js';
import { CollaboratorAgent } from './roles/collaborator.js';
import { DataScientistAgent } from './roles/data-scientist.js';
import { UxResearcherAgent } from './roles/ux-researcher.js';
import { MarketResearcherAgent } from './roles/market-researcher.js';
import { RiskManagerAgent } from './roles/risk-manager.js';
import { LegalAdvisorAgent } from './roles/legal-advisor.js';
import { TechWriterAgent } from './roles/tech-writer.js';

// ---------------------------------------------------------------------------
// AgentFactory — creates agents by role with their default personas
// ---------------------------------------------------------------------------

export class AgentFactory {
  static create(role: AgentRole): BaseAgent {
    switch (role) {
      case AgentRole.RESEARCHER:
        return new ResearcherAgent();
      case AgentRole.ARCHITECT:
        return new ArchitectAgent();
      case AgentRole.DEVELOPER:
        return new DeveloperAgent();
      case AgentRole.CRITIC:
        return new CriticAgent();
      case AgentRole.PM:
        return new PMAgent();
      case AgentRole.QA:
        return new QAAgent();
      case AgentRole.SECURITY:
        return new SecurityAgent();
      case AgentRole.DESIGNER:
        return new DesignerAgent();
      case AgentRole.ANALYST:
        return new AnalystAgent();
      case AgentRole.MEDIATOR:
        return new MediatorAgent();
      case AgentRole.DEVOPS:
        return new DevOpsAgent();
      case AgentRole.SCRUM_MASTER:
        return new ScrumMasterAgent();
      case AgentRole.JUDGE:
        return new JudgeAgent();
      case AgentRole.RETROSPECTIVE:
        return new RetrospectiveAgent();
      case AgentRole.VISIONARY:
        return new VisionaryAgent();
      case AgentRole.INNOVATOR:
        return new InnovatorAgent();
      case AgentRole.STRATEGIST:
        return new StrategistAgent();
      case AgentRole.COLLABORATOR:
        return new CollaboratorAgent();
      case AgentRole.DATA_SCIENTIST:
        return new DataScientistAgent();
      case AgentRole.UX_RESEARCHER:
        return new UxResearcherAgent();
      case AgentRole.MARKET_RESEARCHER:
        return new MarketResearcherAgent();
      case AgentRole.RISK_MANAGER:
        return new RiskManagerAgent();
      case AgentRole.LEGAL_ADVISOR:
        return new LegalAdvisorAgent();
      case AgentRole.TECH_WRITER:
        return new TechWriterAgent();
      default: {
        const _exhaustive: never = role;
        throw new Error(`Unknown AgentRole: ${String(_exhaustive)}`);
      }
    }
  }

  /**
   * Create one agent per role — useful for bootstrapping a full team.
   */
  static createAll(): Map<AgentRole, BaseAgent> {
    const team = new Map<AgentRole, BaseAgent>();
    for (const role of Object.values(AgentRole)) {
      team.set(role, AgentFactory.create(role));
    }
    return team;
  }

  /**
   * Create agents for a specific subset of roles.
   */
  static createMany(roles: AgentRole[]): BaseAgent[] {
    return roles.map((role) => AgentFactory.create(role));
  }
}
