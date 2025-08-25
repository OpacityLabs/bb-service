FROM ubuntu:24.04

# -- argument for version -------------------------------------------------
        ARG BB_VERSION=0.82.3

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

VOLUME ["/target"]

RUN bbup --version ${BB_VERSION}

ENTRYPOINT ["bb"]
