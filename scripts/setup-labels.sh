#!/bin/bash
# schwarm-pm: Create stream + status labels on GitHub (idempotent)
# Usage: bash setup-labels.sh
# Requires: gh CLI authenticated

set -euo pipefail

echo "Creating stream labels..."
gh label create "stream:backend" -c "1d76db" -d "Backend: API, database, shared types" --force 2>/dev/null && echo "  stream:backend"
gh label create "stream:web" -c "0e8a16" -d "Web: frontend application" --force 2>/dev/null && echo "  stream:web"
gh label create "stream:mobile" -c "7057ff" -d "Mobile: native application" --force 2>/dev/null && echo "  stream:mobile"
gh label create "stream:data" -c "fbca04" -d "Data: ML workers, enrichment, connectors" --force 2>/dev/null && echo "  stream:data"

echo "Creating status labels..."
gh label create "status:ready" -c "0075ca" -d "Ready to pick up" --force 2>/dev/null && echo "  status:ready"
gh label create "status:blocked" -c "e4e669" -d "Blocked by dependency" --force 2>/dev/null && echo "  status:blocked"
gh label create "shared:breaking" -c "d93f0b" -d "Breaking change to shared package" --force 2>/dev/null && echo "  shared:breaking"

echo "Done. Labels created/updated."
