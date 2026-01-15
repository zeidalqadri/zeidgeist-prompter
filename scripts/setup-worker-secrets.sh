#!/bin/bash
# Setup secrets for zeidgeist-prompter-api Worker
# Run this script and paste each API key when prompted

set -e

CONFIG_FILE="wrangler-api-worker.toml"
WORKER_NAME="zeidgeist-prompter-api"

echo "=== Setting up secrets for $WORKER_NAME ==="
echo ""
echo "You'll be prompted to enter each API key."
echo "Paste the key and press Enter. The input is hidden for security."
echo ""

# Function to set a secret
set_secret() {
    local name=$1
    echo -n "Enter $name (or press Enter to skip): "
    read -s value
    echo ""

    if [ -n "$value" ]; then
        echo "$value" | npx wrangler secret put "$name" -c "$CONFIG_FILE"
        echo "  ✓ $name set successfully"
    else
        echo "  ⏭ Skipped $name"
    fi
}

# Set each API key
set_secret "CLAUDE_API_KEY"
set_secret "OPENAI_API_KEY"
set_secret "DEEPSEEK_API_KEY"
set_secret "MISTRAL_API_KEY"
set_secret "MOONSHOT_API_KEY"
set_secret "GEMINI_API_KEY"

echo ""
echo "=== Verifying secrets ==="
npx wrangler secret list -c "$CONFIG_FILE"

echo ""
echo "=== Done! ==="
echo "Test the health endpoint:"
echo "  curl -s https://zeidgeist-prompter-api.zeidalqadri.workers.dev/api/engineer | jq ."
