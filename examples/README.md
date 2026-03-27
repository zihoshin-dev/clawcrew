# ClawCrew Examples

## Local review-first run

```bash
clawcrew run "Review and implement a small auth improvement" --mode review --channel local
```

## Resume a paused run

```bash
clawcrew approve <approval-id>
```

## GitHub webhook trigger

```bash
clawcrew webhook github --event pull_request --payload examples/github/pull_request.opened.json
```

## Slack worker mode

```bash
clawcrew start
```
