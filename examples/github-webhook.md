# GitHub Webhook Example

Use the bundled sample payload:

```bash
clawcrew webhook github --event pull_request --payload examples/github/pull_request.opened.json
```

You can also trigger from an issue payload:

```bash
clawcrew webhook github --event issues --payload examples/github/issues.opened.json
```

This creates a persisted webhook-sourced run with the same approval, status, and cost model as CLI-triggered work.

You can also inspect the generated run later:

```bash
clawcrew status
```
