# Slack Steering Example

```bash
clawcrew start
```

With Slack credentials configured in `.env` or config, send a message to the bot. ClawCrew will:

1. create a persisted run
2. post compact status updates
3. pause at approval boundaries
4. resume after an approval message
