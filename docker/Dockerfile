# Clean machine for trying the released `ap` tarball.
# `ap` is deliberately NOT preinstalled: run the README install command yourself.
ARG NODE_VERSION=24
FROM node:${NODE_VERSION}-bookworm

RUN apt-get update \
 && apt-get install -y --no-install-recommends git ca-certificates curl jq less vim-tiny \
 && rm -rf /var/lib/apt/lists/*

# `ap sync` shells out to `claude plugin ...` and `claude mcp ...`.
RUN npm i -g @anthropic-ai/claude-code

USER node
# Global installs go into the user's home, so `npm i -g <url>` works without sudo.
ENV NPM_CONFIG_PREFIX=/home/node/.npm-global \
    PATH=/home/node/.npm-global/bin:$PATH
RUN mkdir -p /home/node/.npm-global /home/node/work \
 && git config --global user.name tester \
 && git config --global user.email tester@example.com \
 && git config --global init.defaultBranch main

WORKDIR /home/node/work
CMD ["bash"]
