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
    docker.io \
    && rm -rf /var/lib/apt/lists/*

# Install AWS CLI v2
RUN curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip" \
    && unzip awscliv2.zip \
    && ./aws/install \
    && rm -rf aws awscliv2.zip

# Create runner user
RUN useradd -m -s /bin/bash runner \
    && usermod -aG docker runner \
    && echo "runner ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers

# GitHub Runner version
ENV RUNNER_VERSION=2.316.1

WORKDIR /home/runner

# Download GitHub Actions Runner
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
