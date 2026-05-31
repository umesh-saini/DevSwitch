#!/bin/bash
# electron-builder Debian afterRemove hook.
#
# Removes the `devswitch` launcher ONLY if it is the one we installed (marked
# with our marker comment). A standalone-installed CLI is never removed, and we
# never touch the shared data store in ~/.config/devswitch so profiles survive
# an app uninstall/reinstall.

set -e

LAUNCHER="/usr/local/bin/devswitch"
MARKER="# devswitch-app-managed"

if [ -e "$LAUNCHER" ] && grep -q "$MARKER" "$LAUNCHER" 2>/dev/null; then
  rm -f "$LAUNCHER"
  echo "devswitch: removed app-managed CLI launcher at $LAUNCHER"
fi

exit 0
