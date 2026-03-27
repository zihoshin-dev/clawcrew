# Changelog

## Unreleased

### Added
- durable run / run-step / run-event runtime model
- persisted approval requests and resumable approval flow
- CLI-first `run`, `approve`, `status`, `watch`, and persisted `cost` commands
- GitHub webhook intake command and sample payload workflow
- expanded builtin tool registry with directory listing and git status
- real `web_search` implementation using DuckDuckGo instant answer API
- file-backed persistence fallback when native SQLite binding is unavailable
- runnable example docs for local review, Slack steering, and GitHub webhook flows

### Changed
- README and package description now reflect the review-first runtime model
- cost reporting now reads persisted truth instead of a fresh in-memory tracker
- messenger ingestion is aligned with persisted run steering
- package release surface now includes publishable files and prepublish build verification
