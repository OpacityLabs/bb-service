# Build stage with bb-tools
FROM ubuntu:24.04 AS bb-tools

# -- argument for version -------------------------------------------------
        ARG BB_VERSION=0.84.0

# -- packages --------------------------------------------------------------
RUN apt-get update && apt-get install -y --no-install-recommends \
        ca-certificates software-properties-common curl \
        clang clang-format cmake ninja-build libstdc++-12-dev jq \
        && apt-get clean \
        && rm -rf /var/lib/apt/lists/*

# -- add toolchain repository ---------------------------------------------
        RUN add-apt-repository -y ppa:ubuntu-toolchain-r/test \
        && apt-get update \
        && apt-get clean \
        && rm -rf /var/lib/apt/lists/*

# -- bbup ------------------------------------------------------------------
RUN curl -L https://raw.githubusercontent.com/AztecProtocol/aztec-packages/refs/heads/master/barretenberg/bbup/install | bash

ENV PATH="/root/.bb:$PATH"

RUN bbup --version ${BB_VERSION}

# Runtime stage for Express service
FROM ubuntu:24.04

# Install Node.js 18 and jq
RUN apt-get update && apt-get install -y --no-install-recommends \
        ca-certificates curl gnupg jq \
        && mkdir -p /etc/apt/keyrings \
        && curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg \
        && echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_18.x nodistro main" | tee /etc/apt/sources.list.d/nodesource.list \
        && apt-get update \
        && apt-get install -y nodejs \
        && apt-get clean \
        && rm -rf /var/lib/apt/lists/*

# Copy bb tools from build stage
COPY --from=bb-tools /root/.bb /root/.bb
ENV PATH="/root/.bb:$PATH"

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

VOLUME ["/target"]

# Expose Express port
EXPOSE 3000

# Run Express service
CMD ["npm", "start"]
