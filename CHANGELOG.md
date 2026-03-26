# Changelog

## Unreleased

### Added
- durable run / run-step / run-event runtime model
- persisted approval requests and resumable approval flow
- CLI-first `run`, `approve`, `status`, `watch`, and persisted `cost` commands
- expanded builtin tool registry with directory listing and git status
- real `web_search` implementation using DuckDuckGo instant answer API
- file-backed persistence fallback when native SQLite binding is unavailable

### Changed
- README and package description now reflect the review-first runtime model
- cost reporting now reads persisted truth instead of a fresh in-memory tracker
- messenger ingestion is aligned with persisted run steering
