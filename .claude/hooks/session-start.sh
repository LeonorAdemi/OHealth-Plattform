#!/bin/bash
# Nur in Cloud-Sitzungen: Abhängigkeiten installieren, damit `npm run check` sofort läuft
# und die Sitzung keine Runden mit dem Einrichten verbringt.
set -euo pipefail
[ "${CLAUDE_CODE_REMOTE:-}" = "true" ] || exit 0
cd "$CLAUDE_PROJECT_DIR"
[ -d node_modules ] || npm ci --no-audit --no-fund --loglevel=error >/dev/null
