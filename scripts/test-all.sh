#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# HammerLock AI — End-to-End Test Script
# ═══════════════════════════════════════════════════════════════
# Runs through all major features and reports pass/fail.
# Prerequisites: App must be running (npx electron .)
#
# Usage: bash scripts/test-all.sh
# ═══════════════════════════════════════════════════════════════

PORT=3100
BASE="http://127.0.0.1:$PORT"
PASS=0
FAIL=0
WARN=0

green() { printf "\033[32m✅ %s\033[0m\n" "$1"; PASS=$((PASS+1)); }
red()   { printf "\033[31m❌ %s\033[0m\n" "$1"; FAIL=$((FAIL+1)); }
yellow(){ printf "\033[33m⚠️  %s\033[0m\n" "$1"; WARN=$((WARN+1)); }
header(){ printf "\n\033[1;36m━━━ %s ━━━\033[0m\n" "$1"; }

# ── Pre-check: is the app running? ──
header "PRE-FLIGHT"
HEALTH=$(curl -s "$BASE/api/health" 2>/dev/null)
if echo "$HEALTH" | grep -q '"ready"'; then
  green "App is running on port $PORT"
else
  red "App NOT running on port $PORT — start it first"
  echo "   Run: cd /Users/miahammer/vaultai && npx electron ."
  exit 1
fi

GW=$(echo "$HEALTH" | grep -o '"gateway":"[^"]*"' | cut -d'"' -f4)
if [ "$GW" = "connected" ]; then
  green "OpenClaw gateway connected"
else
  yellow "OpenClaw gateway: $GW (some features may not work)"
fi

# ── 1. License ──
header "LICENSE"
LICENSE=$(curl -s "$BASE/api/license/check" 2>/dev/null)
TIER=$(echo "$LICENSE" | grep -o '"tier":"[^"]*"' | cut -d'"' -f4)
if [ "$TIER" = "pro" ] || [ "$TIER" = "teams" ]; then
  green "License tier: $TIER"
else
  yellow "License tier: $TIER (some features gated)"
fi

# ── 2. Compute Credits ──
header "COMPUTE CREDITS"
CREDITS=$(cat ~/.hammerlock/credits.json 2>/dev/null)
if [ -n "$CREDITS" ]; then
  TOTAL=$(echo "$CREDITS" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['totalUnits'])")
  USED=$(echo "$CREDITS" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['usedUnits'])")
  REMAINING=$((TOTAL - USED))
  if [ $REMAINING -gt 0 ]; then
    green "Credits: $REMAINING/$TOTAL remaining"
  else
    red "Credits exhausted: $USED/$TOTAL used"
  fi
else
  red "No credits file found"
fi

# ── 3. Permissions ──
header "PERMISSIONS"
PERMS=$(curl -s "$BASE/api/permissions" 2>/dev/null)
if [ -n "$PERMS" ]; then
  echo "$PERMS" | python3 -c "
import sys,json
d=json.load(sys.stdin)
for p in d.get('permissions',[]):
    status = 'PASS' if p['granted'] else ('WARN' if not p['required'] else 'FAIL')
    print(f'{status}|{p[\"name\"]}|{p[\"granted\"]}|{p[\"required\"]}')
" | while IFS='|' read status name granted required; do
    if [ "$status" = "PASS" ]; then
      green "$name: granted"
    elif [ "$status" = "WARN" ]; then
      yellow "$name: not granted (optional)"
    else
      red "$name: not granted (REQUIRED)"
    fi
  done
else
  red "Permissions API not responding"
fi

# ── 4. Google Auth ──
header "GOOGLE AUTH"
GAUTH=$(curl -s "$BASE/api/google-auth" 2>/dev/null)
CONNECTED=$(echo "$GAUTH" | grep -o '"connected":true')
if [ -n "$CONNECTED" ]; then
  ACCOUNT=$(echo "$GAUTH" | grep -o '"accounts":\[[^]]*\]' | head -1)
  green "Google connected: $ACCOUNT"
else
  yellow "Google not connected (optional)"
fi

# ── 5. Integrations / Skills ──
header "INTEGRATIONS"
SETUP=$(curl -s "$BASE/api/setup" 2>/dev/null)
if [ -n "$SETUP" ]; then
  READY=$(echo "$SETUP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('totalReady',0))")
  TOTAL_SK=$(echo "$SETUP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('totalSkills',0))")
  green "Skills: $READY/$TOTAL_SK ready"
  echo "$SETUP" | python3 -c "
import sys,json
d=json.load(sys.stdin)
for c in d.get('categories',[]):
    print(f'   {c[\"emoji\"]} {c[\"label\"]}: {c[\"readyCount\"]}/{c[\"totalCount\"]} ready')
"
else
  red "Setup API not responding"
fi

# ── 6. Apple Reminders ──
header "APPLE REMINDERS"
REM_OUT=$(osascript -e 'tell application "Reminders" to get name of lists' 2>&1)
if [ $? -eq 0 ]; then
  green "Apple Reminders accessible"
else
  red "Apple Reminders: $REM_OUT"
fi

# ── 7. Apple Notes ──
header "APPLE NOTES"
NOTES_OUT=$(osascript -e 'tell application "Notes" to get name of folders' 2>&1)
if [ $? -eq 0 ]; then
  green "Apple Notes accessible"
else
  yellow "Apple Notes: permission may need re-grant"
fi

# ── 8. Apple Calendar ──
header "APPLE CALENDAR"
CAL_OUT=$(osascript -e 'tell application "Calendar" to get name of calendars' 2>&1)
if [ $? -eq 0 ]; then
  green "Apple Calendar accessible"
else
  red "Apple Calendar: $CAL_OUT"
fi

# ── 9. Google via gog CLI ──
header "GOOGLE SERVICES (gog CLI)"
if command -v gog &>/dev/null; then
  GOG_STATUS=$(gog auth status 2>&1)
  GOG_ACCOUNT=$(echo "$GOG_STATUS" | grep "^account" | head -1)
  if echo "$GOG_STATUS" | grep -q "christopherlhammer11"; then
    green "gog: authenticated as christopherlhammer11@gmail.com"

    # Test Gmail
    GMAIL_OUT=$(gog gmail search "in:inbox" --account christopherlhammer11@gmail.com --max 1 2>&1)
    if [ $? -eq 0 ]; then
      green "Gmail: accessible"
    else
      yellow "Gmail: $GMAIL_OUT"
    fi

    # Test Calendar
    CAL_G=$(gog calendar events --account christopherlhammer11@gmail.com --limit 1 2>&1)
    if [ $? -eq 0 ]; then
      green "Google Calendar: accessible"
    else
      yellow "Google Calendar: $CAL_G"
    fi

    # Test Drive
    DRIVE=$(gog drive ls --account christopherlhammer11@gmail.com --limit 1 2>&1)
    if [ $? -eq 0 ]; then
      green "Google Drive: accessible"
    else
      yellow "Google Drive: $DRIVE"
    fi
  else
    yellow "gog: no account connected"
  fi
else
  yellow "gog CLI not found"
fi

# ── 10. TTS (Text-to-Speech) ──
header "VOICE"
TTS_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/tts" -H "Content-Type: application/json" -d '{"text":"test","voice":"nova"}' 2>/dev/null)
if [ "$TTS_CODE" = "200" ]; then
  green "TTS endpoint: working"
else
  red "TTS endpoint: HTTP $TTS_CODE"
fi

TRANS_RESP=$(curl -s -X POST "$BASE/api/transcribe" -H "Content-Type: application/json" -d '{}' 2>/dev/null)
if echo "$TRANS_RESP" | grep -q "multipart\|form-data\|No audio"; then
  green "Transcribe endpoint: responding (expects audio upload)"
else
  red "Transcribe endpoint: $TRANS_RESP"
fi

# ── 11. Chat API ──
header "CHAT"
CHAT_RESP=$(curl -s -X POST "$BASE/api/execute" -H "Content-Type: application/json" \
  -d '{"message":"Say hello in exactly 3 words","history":[],"agentId":"default"}' 2>/dev/null)
if echo "$CHAT_RESP" | grep -q '"response"'; then
  RESP_TEXT=$(echo "$CHAT_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('response','')[:80])")
  green "Chat API: $RESP_TEXT"
else
  if echo "$CHAT_RESP" | grep -q "creditExhausted"; then
    red "Chat API: credits exhausted"
  else
    red "Chat API: unexpected response"
  fi
fi

# ── 12. Bundle Freshness ──
header "BUILD"
SERVED=$(curl -s "$BASE/chat" 2>&1 | grep -o 'page-[a-f0-9]*\.js' | head -1)
DISK=$(ls /Users/miahammer/vaultai/.next/static/chunks/app/chat/ 2>/dev/null)
if [ "$SERVED" = "$DISK" ]; then
  green "Bundle: served matches disk ($SERVED)"
else
  red "Bundle mismatch! Served: $SERVED | Disk: $DISK"
fi

HAS_PERMS=$(curl -s "$BASE/_next/static/chunks/app/chat/$SERVED" 2>/dev/null | grep -c "onOpenPermissions")
if [ "$HAS_PERMS" -gt 0 ]; then
  green "PermissionsSetup: in bundle"
else
  red "PermissionsSetup: NOT in bundle"
fi

# ── Summary ──
header "SUMMARY"
printf "\033[32m✅ Passed: $PASS\033[0m\n"
printf "\033[33m⚠️  Warnings: $WARN\033[0m\n"
printf "\033[31m❌ Failed: $FAIL\033[0m\n"
echo ""
if [ $FAIL -eq 0 ]; then
  printf "\033[1;32m🔨 All critical tests passed!\033[0m\n"
else
  printf "\033[1;31m🔧 $FAIL test(s) need attention\033[0m\n"
fi
echo ""
