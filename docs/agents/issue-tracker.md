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

## Wayfinding operations

How this tracker expresses the wayfinder skill's concepts (labels already exist):

- **Map**: an issue labeled `wayfinder:map`. Tickets are **native sub-issues** of the map: `gh api -X POST repos/{owner}/{repo}/issues/<map>/sub_issues -F sub_issue_id=<child internal id>` (internal id via `gh api repos/{owner}/{repo}/issues/<n> -q .id`).
- **Ticket types**: labels `wayfinder:research` / `wayfinder:prototype` / `wayfinder:grilling` / `wayfinder:task`.
- **Blocking**: native issue dependencies — `gh api -X POST repos/{owner}/{repo}/issues/<n>/dependencies/blocked_by -F issue_id=<blocker internal id>` — plus a human-readable `Blocked by: #N` line at the end of the ticket body.
- **Claim**: assign the issue to yourself before working it; open + unassigned = unclaimed.
- **Frontier**: open, unassigned sub-issues whose `dependencies/blocked_by` are all closed: list via `gh api graphql` on the map's `subIssues`, or `gh api repos/{owner}/{repo}/issues/<n>/dependencies/blocked_by -q '.[].state'` per candidate.

## PRDs

When a skill says to publish a PRD, create a GitHub issue and apply the `PRD` label plus the mapped `ready-for-agent` label from `docs/agents/triage-labels.md`.
