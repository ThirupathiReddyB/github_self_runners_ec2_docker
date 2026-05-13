FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

# Install required packages
RUN apt-get update && apt-get install -y \
    curl \
    git \
    jq \
    sudo \
    unzip \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Create runner user
RUN useradd -m -s /bin/bash runner \
    && echo "runner ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers

# GitHub Runner version
ENV RUNNER_VERSION=2.316.1

WORKDIR /home/runner

# Download GitHub Actions Runner (x64)
RUN curl -L -o actions-runner.tar.gz \
    https://github.com/actions/runner/releases/download/v${RUNNER_VERSION}/actions-runner-linux-x64-${RUNNER_VERSION}.tar.gz \
    && tar xzf actions-runner.tar.gz \
    && rm actions-runner.tar.gz \
    && ./bin/installdependencies.sh

# Copy startup script
COPY start.sh /home/runner/start.sh

# Permissions
RUN chmod +x /home/runner/start.sh \
    && chown -R runner:runner /home/runner

USER runner

ENTRYPOINT ["/home/runner/start.sh"]
