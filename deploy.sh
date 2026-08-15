#!/usr/bin/env bash
# Deploy the latest main branch to the EC2 server.
#
# Usage: ./deploy.sh
# Override defaults with env vars, e.g.: DEPLOY_HOST=1.2.3.4 ./deploy.sh
set -euo pipefail

DEPLOY_HOST="${DEPLOY_HOST:-23.22.144.99}"
DEPLOY_USER="${DEPLOY_USER:-ubuntu}"
DEPLOY_KEY="${DEPLOY_KEY:-$HOME/.ssh/budget-tracker.pem}"
REMOTE_DIR="${REMOTE_DIR:-budget-tracker}"

echo "Deploying to $DEPLOY_USER@$DEPLOY_HOST..."

ssh -i "$DEPLOY_KEY" "$DEPLOY_USER@$DEPLOY_HOST" bash -s <<EOF
set -euo pipefail
cd "$REMOTE_DIR"
echo "Pulling latest code..."
git pull origin main
echo "Rebuilding and restarting containers..."
sudo docker compose up -d --build
echo "Pruning old images..."
sudo docker image prune -f
echo "Deploy complete. Recent backend logs:"
sudo docker logs budget-tracker-backend-1 --tail 15
EOF

echo "Done. Check http://$DEPLOY_HOST"
