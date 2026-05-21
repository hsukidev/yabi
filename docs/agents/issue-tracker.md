# Issue Tracker: GitHub

Issues and PRDs for this repo live as GitHub issues in `hsukidev/yabi`. Use the `gh` CLI for issue operations.

## Conventions

- Create an issue with `gh issue create --title "..." --body "..."`.
- Read an issue with `gh issue view <number> --comments`.
- List issues with `gh issue list --state open --json number,title,body,labels,comments`.
- Comment with `gh issue comment <number> --body "..."`.
- Apply labels with `gh issue edit <number> --add-label "..."`.
- Close with `gh issue close <number> --comment "..."`.

Infer the repo from `git remote -v`; `gh` does this automatically when run inside this clone.

## PRDs

When a skill says to publish a PRD, create a GitHub issue and apply the `PRD` label plus the mapped `ready-for-agent` label from `docs/agents/triage-labels.md`.
