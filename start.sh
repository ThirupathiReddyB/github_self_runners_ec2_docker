#!/bin/bash
set -e

cd /home/runner

# Validate environment variables
if [ -z "$GITHUB_TOKEN" ]; then
  echo "❌ GITHUB_TOKEN is missing"
  exit 1
fi

if [ -z "$REPO_URL" ]; then
  echo "❌ REPO_URL is missing"
  exit 1
fi

RUNNER_NAME=${RUNNER_NAME:-docker-runner}
RUNNER_LABELS=${RUNNER_LABELS:-self-hosted,linux,docker}

echo "🔑 Getting registration token..."

REPO_PATH=$(echo "$REPO_URL" | sed 's|https://github.com/||')

REG_TOKEN=$(curl -s -X POST \
  -H "Authorization: token $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github+json" \
  https://api.github.com/repos/${REPO_PATH}/actions/runners/registration-token \
  | jq -r .token)

if [ -z "$REG_TOKEN" ] || [ "$REG_TOKEN" = "null" ]; then
  echo "❌ Failed to get registration token"
  exit 1
fi

echo "✅ Token received"

./config.sh \
  --url "$REPO_URL" \
  --token "$REG_TOKEN" \
  --name "$RUNNER_NAME" \
  --labels "$RUNNER_LABELS" \
  --unattended \
  --replace

cleanup() {
  echo "🛑 Removing runner..."
  ./config.sh remove --unattended --token "$REG_TOKEN"
}

trap cleanup EXIT

echo "🚀 Runner started"

./run.sh
