import { RunMode, RunSource, type SubmitRunOptions } from '../core/types.js';

export interface GitHubWebhookRunRequest {
  agenda: string;
  channel: string;
  options: SubmitRunOptions;
}

export function createGitHubWebhookRunRequest(args: {
  event: string;
  payload: Record<string, unknown>;
  mode?: RunMode;
}): GitHubWebhookRunRequest {
  const repo = getRepositoryFullName(args.payload) ?? 'unknown/unknown';
  const event = args.event;
  const action = readString(args.payload['action']);
  const sender = readString((args.payload['sender'] as Record<string, unknown> | undefined)?.['login']) ?? 'unknown-user';
  const channel = `github:${repo}`;

  if (event === 'pull_request') {
    const pullRequest = args.payload['pull_request'] as Record<string, unknown> | undefined;
    const title = readString(pullRequest?.['title']) ?? 'Untitled pull request';
    const number = readNumber(pullRequest?.['number']) ?? readNumber(args.payload['number']);
    return {
      agenda: `[GitHub PR] ${repo}#${number ?? '?'} ${action ?? 'updated'} — ${title}`,
      channel,
      options: {
        mode: args.mode ?? RunMode.REVIEW,
        source: RunSource.WEBHOOK,
        requestedBy: sender,
        metadata: {
          provider: 'github',
          event,
          action,
          repository: repo,
          pullRequestNumber: number,
          title,
        },
      },
    };
  }

  if (event === 'issue_comment') {
    const issue = args.payload['issue'] as Record<string, unknown> | undefined;
    const comment = args.payload['comment'] as Record<string, unknown> | undefined;
    const body = readString(comment?.['body']) ?? '';
    const title = readString(issue?.['title']) ?? 'Untitled issue';
    const number = readNumber(issue?.['number']) ?? readNumber(args.payload['number']);
    return {
      agenda: `[GitHub Comment] ${repo}#${number ?? '?'} ${action ?? 'created'} — ${title}\n${body}`.trim(),
      channel,
      options: {
        mode: args.mode ?? RunMode.REVIEW,
        source: RunSource.WEBHOOK,
        requestedBy: sender,
        metadata: {
          provider: 'github',
          event,
          action,
          repository: repo,
          issueNumber: number,
          title,
          commentBody: body,
        },
      },
    };
  }

  if (event === 'issues') {
    const issue = args.payload['issue'] as Record<string, unknown> | undefined;
    const title = readString(issue?.['title']) ?? 'Untitled issue';
    const number = readNumber(issue?.['number']) ?? readNumber(args.payload['number']);
    return {
      agenda: `[GitHub Issue] ${repo}#${number ?? '?'} ${action ?? 'updated'} — ${title}`,
      channel,
      options: {
        mode: args.mode ?? RunMode.REVIEW,
        source: RunSource.WEBHOOK,
        requestedBy: sender,
        metadata: {
          provider: 'github',
          event,
          action,
          repository: repo,
          issueNumber: number,
          title,
        },
      },
    };
  }

  return {
    agenda: `[GitHub ${event}] ${repo} ${action ?? 'event'} from ${sender}`,
    channel,
    options: {
      mode: args.mode ?? RunMode.REVIEW,
      source: RunSource.WEBHOOK,
      requestedBy: sender,
      metadata: {
        provider: 'github',
        event,
        action,
        repository: repo,
      },
    },
  };
}

function getRepositoryFullName(payload: Record<string, unknown>): string | undefined {
  const repository = payload['repository'] as Record<string, unknown> | undefined;
  return readString(repository?.['full_name']);
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function readNumber(value: unknown): number | undefined {
  return typeof value === 'number' ? value : undefined;
}
