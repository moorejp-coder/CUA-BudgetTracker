#!/usr/bin/env bash
# Reset the judge-demo and test login profiles on the live EC2 server.
#
# Runs `scripts.seed_demo_data` inside the live backend container over SSH. Wipes and
# rebuilds ONLY the judge@example.com and test@example.com profiles — no other user data
# is touched. Deliberately takes no arguments/env overrides so this script's exact
# invocation can be safely allowlisted without granting broader SSH/exec access.
#
# Usage: ./seed-live.sh
set -euo pipefail

DEPLOY_HOST="54.175.240.105"
DEPLOY_USER="ubuntu"
DEPLOY_KEY="$HOME/.ssh/budget-tracker.pem"
CONTAINER="budget-tracker-backend-1"

echo "Seeding judge-demo and test profiles on $DEPLOY_HOST..."
ssh -i "$DEPLOY_KEY" "$DEPLOY_USER@$DEPLOY_HOST" "sudo docker exec $CONTAINER python -m scripts.seed_demo_data"
echo "Done."
