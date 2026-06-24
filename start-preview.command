#!/bin/bash
# Double-click this in Finder to start the local preview server.
# It opens http://localhost:8766 in your default browser, then keeps running
# in the Terminal window — close that window to stop the server.

cd "$(dirname "$0")"

PORT=8766

# If something is already on the port, kill it
EXISTING_PID=$(lsof -ti:$PORT 2>/dev/null)
if [ -n "$EXISTING_PID" ]; then
  echo "Port $PORT is busy — stopping the old server (pid $EXISTING_PID)..."
  kill -9 $EXISTING_PID 2>/dev/null
  sleep 0.5
fi

echo ""
echo "  Wendi Jiang — portfolio preview"
echo "  ────────────────────────────────"
echo "  Opening http://localhost:$PORT in your browser..."
echo ""
echo "  ✱ Close this Terminal window to stop the server."
echo ""

# Open in browser after a tiny delay so the server has time to start
( sleep 1 && open "http://localhost:$PORT" ) &

# Start the server in the foreground (so closing Terminal stops it)
python3 -m http.server $PORT
