---
name: afk
description: Orchestrate all open AFK-labeled GitHub issues to completion — parallel worktree agents, wave by wave, merged through an integration branch to main.
disable-model-invocation: true
---

# AFK Orchestration

You are the orchestrator. Builder-agents write all the code; you map, spawn, gate, merge, and close. Two leading words carry the whole flow: a **wave** is every ticket whose blockers have all landed, and **green** is typecheck + full test suite passing in the integration worktree.

## 1. Map the tickets

- `gh issue list --label AFK --state open --json number,title,body,labels`
- Build the dependency graph from each body's "Blocked by" section.
- Mirror the graph with TaskCreate/TaskUpdate (`addBlockedBy`) so progress is visible.

Done when: every open AFK issue sits in exactly one wave, the graph has no cycles, and the wave order is reported to the user before any agent spawns.

## 2. Stage the integration branch

- `git branch merge main`, then `git worktree add .claude/worktrees/merge-integration merge` — merging needs a checkout, and a dedicated worktree leaves the user's (possibly dirty) main checkout untouched.
- Worktrees see only commits. If a ticket depends on files that exist only uncommitted in the main checkout, surface that to the user before spawning.

Done when: the integration worktree is on `merge` with dependencies installed (`pnpm install`).

## 3. Run the wave

Spawn one builder-agent per ticket in the wave — all in parallel, each `isolation: "worktree"`, `run_in_background`. Compose each prompt from [agent-prompt.md](agent-prompt.md), including the accumulated known-noise list (flakes, pre-existing lint warnings) learned from earlier waves.

Done when: every ticket in the wave has a running agent and an in_progress task.

## 4. Land each finished ticket

When an agent reports done:

1. In the integration worktree: `git merge --no-ff <agent-branch> -m "Merge #<n>: <title>"`.
2. Gate on green: `pnpm typecheck && pnpm test` there, post-merge. Red goes back to the same agent via SendMessage with the failure output; the ticket lands only green.
3. `gh issue close <n> --comment "..."` — name the implementation commit and restate any flags the agent raised (these also go in your final report).
4. Mark the task completed, then recompute the wave: a landed ticket can unblock several, and newly unblocked tickets spawn immediately (step 3).

Done when: merge commit on `merge`, gate green, issue closed, task completed.

## 5. Finish

Only after every AFK issue is closed:

- Close the parent PRD/epic (if all its children landed) with a verification summary.
- In the main checkout: `git merge --no-ff merge -m "Merge branch 'merge': <feature> (#<epic>)"`. Leave the result local — pushing is the user's call.
- Add a `.changes/` changeset if the landed work is user-facing and no agent already added one.
- Clean up: `git worktree remove` every agent worktree and the integration worktree; `git branch -d` their branches and `merge`.

Done when: main holds the work, `git worktree list` shows only the main checkout, and the final report lists closed issues, the last green run, and every flag raised along the way.
