# AGENTS.md

The role of this file is to describe common mistakes and confusion points that agents might encounter as they work in this project. If you ever encounter something in the project that surprises you, please alert the developer working with you and indicate that this is the case in the AGENTS.md file to help prevent future agents from having the same issue.

## Worktrees live under `.claude/worktrees/agent-*`

When an agent is launched with its own worktree, the cwd is
`/home/.../yabi/.claude/worktrees/agent-<hash>` — **not** the
main checkout at `/home/.../yabi`. Both paths contain a
`src/` tree, but only the worktree path is on the agent's branch.

Always use the worktree-relative path (either `./src/...` relative paths or the
absolute worktree path) when reading and editing files. An absolute path
starting with `/home/.../yabi/src/...` will silently read the
**main branch's** copy of the file, which is confusing when the worktree has
predecessor-slice changes that aren't yet in main.

`git worktree list` will show the full path for the current agent's worktree.
