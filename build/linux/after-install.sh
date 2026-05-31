#!/bin/bash
# electron-builder Debian afterInstall hook.
#
# Installs the bundled `devswitch` CLI so it is available system-wide right
# after the desktop app is installed. The CLI and the app share the same
# on-disk data store, so they work together regardless of install order.
#
# We DO NOT clobber an existing standalone CLI: if `devswitch` already exists
# and is NOT our app-managed symlink, we leave it alone (the user installed the
# CLI separately and that copy wins).

set -e

# electron-builder installs the app under /opt/<productName>.
# The bundled CLI is shipped as an extraResource at resources/cli/devswitch.cjs.
APP_DIR="/opt/DevSwitch"
# Fallbacks for differing productName casing.
if [ ! -d "$APP_DIR" ]; then
  APP_DIR="$(dirname "$(readlink -f "$0")")/.."
fi

CLI_SRC="$APP_DIR/resources/cli/devswitch.cjs"
LAUNCHER="/usr/local/bin/devswitch"
MARKER="# devswitch-app-managed"

# Locate a usable node runtime. Prefer system node; otherwise fall back to the
# Electron binary running as a plain Node script via ELECTRON_RUN_AS_NODE.
NODE_BIN="$(command -v node || true)"
ELECTRON_BIN="$APP_DIR/devswitch"
if [ ! -x "$ELECTRON_BIN" ]; then
  ELECTRON_BIN="$APP_DIR/DevSwitch"
fi

if [ ! -f "$CLI_SRC" ]; then
  echo "devswitch: bundled CLI not found at $CLI_SRC; skipping CLI install."
  exit 0
fi

# If something already occupies the launcher path and it isn't ours, respect it.
if [ -e "$LAUNCHER" ] && ! grep -q "$MARKER" "$LAUNCHER" 2>/dev/null; then
  echo "devswitch: an existing '$LAUNCHER' is present (standalone install). Leaving it untouched."
  exit 0
fi

# Write a small launcher wrapper that runs the bundled CLI.
mkdir -p "$(dirname "$LAUNCHER")"
cat > "$LAUNCHER" <<EOF
#!/bin/bash
$MARKER
# Launcher for the DevSwitch CLI bundled with the desktop app.
if command -v node >/dev/null 2>&1; then
  exec node "$CLI_SRC" "\$@"
elif [ -x "$ELECTRON_BIN" ]; then
  # Run Electron's bundled Node as a plain Node interpreter.
  ELECTRON_RUN_AS_NODE=1 exec "$ELECTRON_BIN" "$CLI_SRC" "\$@"
else
  echo "devswitch: no Node.js runtime found. Install Node.js or the standalone CLI." >&2
  exit 1
fi
EOF

chmod 755 "$LAUNCHER"
echo "devswitch: CLI installed at $LAUNCHER"
exit 0
