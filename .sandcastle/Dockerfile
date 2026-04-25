FROM node:22-bookworm

# Install system dependencies
RUN apt-get update && apt-get install -y \
  git \
  curl \
  jq \
  && rm -rf /var/lib/apt/lists/*

# Install GitHub CLI
RUN curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg \
  | dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg \
  && echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" \
  | tee /etc/apt/sources.list.d/github-cli.list > /dev/null \
  && apt-get update && apt-get install -y gh \
  && rm -rf /var/lib/apt/lists/*

# Enable Corepack as root (writes shims to /usr/local/bin).
# Node 22 ships Corepack but does not enable it by default.
RUN corepack enable

# Allow Corepack to download package manager binaries non-interactively.
# Without this, Corepack prints "! Corepack is about to download ..." and
# exits non-zero in non-TTY contexts (e.g. the sandbox's pnpm install hook).
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0

# Mark this as a CI-like environment so pnpm doesn't prompt for destructive
# actions (e.g. ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY when the host's
# copied-in node_modules layout doesn't match the container's pnpm).
ENV CI=true

# Rename the base image's "node" user (UID 1000) to "agent".
# This keeps UID 1000 so that --userns=keep-id (Podman) and
# --user 1000:1000 (Docker) map to the correct home directory owner.
RUN usermod -d /home/agent -m -l agent node
USER agent

# Pre-fetch the pnpm version pinned in package.json into the agent user's
# Corepack cache (~/.cache/node/corepack). Must run AFTER `USER agent` —
# otherwise the binary is cached under root's home and the agent runtime
# cache-misses, forcing a network download on first `pnpm install`.
RUN corepack prepare pnpm@10.33.0 --activate

# Install Claude Code CLI
RUN curl -fsSL https://claude.ai/install.sh | bash

# Add Claude to PATH
ENV PATH="/home/agent/.local/bin:$PATH"

WORKDIR /home/agent

# In worktree sandbox mode, Sandcastle bind-mounts the git worktree at /home/agent/workspace
# and overrides the working directory to /home/agent/workspace at container start.
# Structure your Dockerfile so that /home/agent/workspace can serve as the project root.
ENTRYPOINT ["sleep", "infinity"]
