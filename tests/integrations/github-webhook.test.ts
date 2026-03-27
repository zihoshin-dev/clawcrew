import { describe, it, expect } from 'vitest';
import { RunMode, RunSource } from '../../src/core/types.js';
import { createGitHubWebhookRunRequest } from '../../src/integrations/github-webhook.js';

describe('createGitHubWebhookRunRequest', () => {
  it('creates a review-mode run request from a pull_request payload', () => {
    const request = createGitHubWebhookRunRequest({
      event: 'pull_request',
      payload: {
        action: 'opened',
        repository: { full_name: 'acme/clawcrew' },
        sender: { login: 'ziho' },
        pull_request: { title: 'Add runtime guardrails', number: 42 },
      },
      mode: RunMode.REVIEW,
    });

    expect(request.channel).toBe('github:acme/clawcrew');
    expect(request.options.source).toBe(RunSource.WEBHOOK);
    expect(request.options.mode).toBe(RunMode.REVIEW);
    expect(request.agenda).toContain('acme/clawcrew#42');
    expect(request.agenda).toContain('Add runtime guardrails');
  });

  it('uses issue comment body in the generated agenda', () => {
    const request = createGitHubWebhookRunRequest({
      event: 'issue_comment',
      payload: {
        action: 'created',
        repository: { full_name: 'acme/clawcrew' },
        sender: { login: 'reviewer' },
        issue: { title: 'Investigate flaky runtime test', number: 7 },
        comment: { body: '/clawcrew review this failure path' },
      },
    });

    expect(request.agenda).toContain('Investigate flaky runtime test');
    expect(request.agenda).toContain('/clawcrew review this failure path');
  });

  it('creates a run request from an issues payload', () => {
    const request = createGitHubWebhookRunRequest({
      event: 'issues',
      payload: {
        action: 'opened',
        repository: { full_name: 'acme/clawcrew' },
        sender: { login: 'triager' },
        issue: { title: 'Webhook-driven issue triage', number: 11 },
      },
    });

    expect(request.channel).toBe('github:acme/clawcrew');
    expect(request.agenda).toContain('Webhook-driven issue triage');
    expect(request.agenda).toContain('#11');
  });
});
