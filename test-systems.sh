#!/usr/bin/env bash
# =============================================================================
# Follow Us Everywhere — Full Systems Test Script
# Usage:
#   ./test-systems.sh                        # tests production API
#   API=http://localhost:5000/api ./test-systems.sh   # tests local
#
# Requirements: curl, jq
# =============================================================================

set -euo pipefail

# ─── Config ──────────────────────────────────────────────────────────────────
API="${API:-https://followuseverywhere-api.onrender.com/api}"
SITE="${SITE:-https://fuse101.com}"

# ─── Test credentials (change these before running) ──────────────────────────
BIZ_EMAIL="${BIZ_EMAIL:-testbiz@example.com}"
BIZ_PASSWORD="${BIZ_PASSWORD:-TestPassword123!}"
CUST_EMAIL="${CUST_EMAIL:-testcust@example.com}"
CUST_PASSWORD="${CUST_PASSWORD:-TestPassword123!}"
ADMIN_EMAIL="${ADMIN_EMAIL:-}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-}"
ADMIN_TOTP="${ADMIN_TOTP:-}"          # 6-digit code from your TOTP app
PUBLIC_SLUG="${PUBLIC_SLUG:-}"        # a real slug in the DB

# ─── Helpers ─────────────────────────────────────────────────────────────────
PASS=0; FAIL=0; SKIP=0
BIZ_TOKEN=""; CUST_TOKEN=""; ADMIN_TOKEN=""
BIZ_ID=""; NFC_DEVICE_ID=""; BADGE_REQUEST_ID=""

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

header()  { echo -e "\n${CYAN}${BOLD}══ $* ══${RESET}"; }
info()    { echo -e "   ${YELLOW}→ $*${RESET}"; }
ok()      { echo -e "   ${GREEN}✓ $*${RESET}"; PASS=$((PASS+1)); }
fail()    { echo -e "   ${RED}✗ $*${RESET}"; FAIL=$((FAIL+1)); }
skip()    { echo -e "   ${YELLOW}⊘ $* (skipped)${RESET}"; SKIP=$((SKIP+1)); }

# Run curl; capture HTTP status + body; assert status matches expected
check() {
  local label="$1"; local expected="$2"; shift 2
  local out; out=$(curl -s -w '\n__STATUS__%{http_code}' "$@")
  local body; body=$(echo "$out" | sed '$d')
  local status; status=$(echo "$out" | tail -1 | sed 's/__STATUS__//')
  if [[ "$status" == "$expected" ]]; then
    ok "$label [HTTP $status]"
    echo "$body"
  else
    fail "$label — expected HTTP $expected, got $status"
    echo "$body" | head -5
    echo ""
  fi
}

# Like check() but returns body to a variable; doesn't print body
check_capture() {
  local label="$1"; local expected="$2"; local var="$3"; shift 3
  local out; out=$(curl -s -w '\n__STATUS__%{http_code}' "$@")
  local body; body=$(echo "$out" | sed '$d')
  local status; status=$(echo "$out" | tail -1 | sed 's/__STATUS__//')
  eval "$var=\$body"
  if [[ "$status" == "$expected" ]]; then
    ok "$label [HTTP $status]"
  else
    fail "$label — expected HTTP $expected, got $status"
    echo "$body" | head -5
  fi
}

auth_header() { echo "Authorization: Bearer $1"; }

# ─────────────────────────────────────────────────────────────────────────────
# 1. HEALTH CHECK
# ─────────────────────────────────────────────────────────────────────────────
header "1. Health Check"

resp=$(check "GET /api/health" "200" "${API}/health")
db_status=$(echo "$resp" | jq -r '.db // empty' 2>/dev/null)
if [[ "$db_status" == "ok" ]]; then
  ok "Database reachable"
else
  fail "Database status: ${db_status:-unknown}"
fi

# ─────────────────────────────────────────────────────────────────────────────
# 2. PUBLIC ENDPOINTS (no auth)
# ─────────────────────────────────────────────────────────────────────────────
header "2. Public Endpoints"

check "GET /api/public/businesses (list)" "200" \
  "${API}/public/businesses?page=1&limit=5"

if [[ -n "$PUBLIC_SLUG" ]]; then
  resp=$(check "GET /api/public/businesses/by-slug/:slug" "200" \
    "${API}/public/businesses/by-slug/${PUBLIC_SLUG}")
  show_qr=$(echo "$resp" | jq -r '.show_qr // empty' 2>/dev/null)
  [[ "$show_qr" == "true" || "$show_qr" == "false" ]] && ok "show_qr field present: $show_qr" || fail "show_qr field missing"

  check "GET /api/public/businesses/slug/:slug (alias)" "200" \
    "${API}/public/businesses/slug/${PUBLIC_SLUG}"

  check "GET /api/public/businesses/:slug/vcard" "200" \
    -H "Accept: text/vcard" "${API}/public/businesses/${PUBLIC_SLUG}/vcard"

  check "GET /api/public/businesses/:id/impact (badges)" "200" \
    "${API}/public/businesses/${PUBLIC_SLUG}/impact" || true

  check "GET /api/badges (public badge list)" "200" "${API}/badges"
else
  skip "PUBLIC_SLUG not set — skipping slug-based public tests"
  skip "vCard download"
  skip "Impact/badges by slug"
fi

# ─────────────────────────────────────────────────────────────────────────────
# 3. QR / NFC REDIRECTS
# ─────────────────────────────────────────────────────────────────────────────
header "3. QR / NFC Redirects"

if [[ -n "$PUBLIC_SLUG" ]]; then
  QR_BASE="${SITE}/qr"

  # Expect 302 redirect
  redir=$(curl -s -o /dev/null -w '%{redirect_url}' "${QR_BASE}/${PUBLIC_SLUG}")
  expected_redir="${SITE}/b/${PUBLIC_SLUG}"
  if [[ "$redir" == "$expected_redir" ]]; then
    ok "QR redirect → /b/:slug"
  else
    fail "QR redirect: expected '$expected_redir', got '$redir'"
  fi

  redir_nfc=$(curl -s -o /dev/null -w '%{redirect_url}' "${QR_BASE}/${PUBLIC_SLUG}?src=nfc")
  if [[ "$redir_nfc" == "$expected_redir" ]]; then
    ok "NFC redirect (?src=nfc) → /b/:slug"
  else
    fail "NFC redirect: expected '$expected_redir', got '$redir_nfc'"
  fi

  redir_link=$(curl -s -o /dev/null -w '%{redirect_url}' "${QR_BASE}/${PUBLIC_SLUG}?src=link")
  if [[ "$redir_link" == "$expected_redir" ]]; then
    ok "Link redirect (?src=link) → /b/:slug"
  else
    fail "Link redirect: expected '$expected_redir', got '$redir_link'"
  fi

  check "GET /qr/analytics/:slug" "200" \
    "${SITE}/qr/analytics/${PUBLIC_SLUG}"
else
  skip "PUBLIC_SLUG not set — skipping QR/NFC redirect tests"
fi

# ─────────────────────────────────────────────────────────────────────────────
# 4. BUSINESS AUTH
# ─────────────────────────────────────────────────────────────────────────────
header "4. Business Auth"

if [[ -z "$BIZ_EMAIL" || -z "$BIZ_PASSWORD" ]]; then
  skip "BIZ_EMAIL / BIZ_PASSWORD not set"
else
  # Invalid credentials
  check "POST /api/auth/login (bad password)" "400" \
    -X POST "${API}/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"bad@example.com","password":"wrong"}'

  # Valid login
  check_capture "POST /api/auth/login" "200" login_resp \
    -X POST "${API}/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"${BIZ_EMAIL}\",\"password\":\"${BIZ_PASSWORD}\"}"

  BIZ_TOKEN=$(echo "$login_resp" | jq -r '.token // empty' 2>/dev/null)
  if [[ -n "$BIZ_TOKEN" ]]; then
    ok "Business JWT received"
  else
    fail "Business JWT missing — remaining business tests will fail"
  fi

  check "GET /api/auth/me" "200" \
    -H "$(auth_header "$BIZ_TOKEN")" "${API}/auth/me"

  # Unauthenticated access should be rejected
  check "GET /api/auth/me (no token) → 401" "401" "${API}/auth/me"
fi

# ─────────────────────────────────────────────────────────────────────────────
# 5. BUSINESS PROFILE
# ─────────────────────────────────────────────────────────────────────────────
header "5. Business Profile"

if [[ -z "$BIZ_TOKEN" ]]; then
  skip "No business token — skipping profile tests"
else
  check_capture "PUT /api/businesses/profile/update" "200" profile_resp \
    -X PUT "${API}/businesses/profile/update" \
    -H "$(auth_header "$BIZ_TOKEN")" \
    -H "Content-Type: application/json" \
    -d '{"tagline":"Systems test tagline"}'

  show_qr_val=$(echo "$profile_resp" | jq -r '.show_qr // empty' 2>/dev/null)
  [[ -n "$show_qr_val" ]] && ok "show_qr in profile response: $show_qr_val" || fail "show_qr missing from profile response"

  check "GET /api/businesses/documents" "200" \
    -H "$(auth_header "$BIZ_TOKEN")" "${API}/businesses/documents"
fi

# ─────────────────────────────────────────────────────────────────────────────
# 6. SOCIALS
# ─────────────────────────────────────────────────────────────────────────────
header "6. Socials"

if [[ -n "$PUBLIC_SLUG" ]]; then
  check "GET /api/socials/:slug (public)" "200" \
    "${API}/socials/${PUBLIC_SLUG}"
else
  skip "PUBLIC_SLUG not set — skipping public socials test"
fi

if [[ -n "$BIZ_TOKEN" ]]; then
  me_resp=$(curl -s -H "$(auth_header "$BIZ_TOKEN")" "${API}/auth/me")
  BIZ_ID=$(echo "$me_resp" | jq -r '.id // empty' 2>/dev/null)
  if [[ -n "$BIZ_ID" ]]; then
    check "GET /api/socials/business/:id" "200" \
      "${API}/socials/business/${BIZ_ID}"
  fi
else
  skip "No business token — skipping authenticated socials test"
fi

# ─────────────────────────────────────────────────────────────────────────────
# 7. NFC DEVICES
# ─────────────────────────────────────────────────────────────────────────────
header "7. NFC Devices"

if [[ -z "$BIZ_TOKEN" ]]; then
  skip "No business token — skipping NFC tests"
else
  check "GET /api/nfc/devices (empty or list)" "200" \
    -H "$(auth_header "$BIZ_TOKEN")" "${API}/nfc/devices"

  check_capture "POST /api/nfc/devices (register)" "201" nfc_resp \
    -X POST "${API}/nfc/devices" \
    -H "$(auth_header "$BIZ_TOKEN")" \
    -H "Content-Type: application/json" \
    -d '{"label":"Test Card","chip_type":"NTAG213"}'

  NFC_DEVICE_ID=$(echo "$nfc_resp" | jq -r '.device.id // empty' 2>/dev/null)
  encoded_url=$(echo "$nfc_resp" | jq -r '.device.encoded_url // empty' 2>/dev/null)
  if [[ -n "$NFC_DEVICE_ID" ]]; then
    ok "NFC device created (id=$NFC_DEVICE_ID)"
    info "Encoded URL: $encoded_url"
    expected_url_part="/qr/"
    [[ "$encoded_url" == *"$expected_url_part"* && "$encoded_url" == *"src=nfc"* ]] \
      && ok "encoded_url contains /qr/ and ?src=nfc" \
      || fail "encoded_url format unexpected: $encoded_url"
  else
    fail "NFC device ID missing from response"
  fi

  if [[ -n "$NFC_DEVICE_ID" ]]; then
    check "PUT /api/nfc/devices/:id (rename)" "200" \
      -X PUT "${API}/nfc/devices/${NFC_DEVICE_ID}" \
      -H "$(auth_header "$BIZ_TOKEN")" \
      -H "Content-Type: application/json" \
      -d '{"label":"Renamed Card","is_active":false}'

    check "GET /api/nfc/devices/:id/stats" "200" \
      -H "$(auth_header "$BIZ_TOKEN")" "${API}/nfc/devices/${NFC_DEVICE_ID}/stats"

    check "DELETE /api/nfc/devices/:id" "200" \
      -X DELETE "${API}/nfc/devices/${NFC_DEVICE_ID}" \
      -H "$(auth_header "$BIZ_TOKEN")"
  fi

  # Invalid chip type should be rejected
  check "POST /api/nfc/devices (bad chip_type) → 400" "400" \
    -X POST "${API}/nfc/devices" \
    -H "$(auth_header "$BIZ_TOKEN")" \
    -H "Content-Type: application/json" \
    -d '{"label":"Bad","chip_type":"INVALID_CHIP"}'
fi

# ─────────────────────────────────────────────────────────────────────────────
# 8. BADGE REQUESTS
# ─────────────────────────────────────────────────────────────────────────────
header "8. Badge Requests"

if [[ -z "$BIZ_TOKEN" ]]; then
  skip "No business token — skipping badge request tests"
else
  check "GET /api/business/badge-requests" "200" \
    -H "$(auth_header "$BIZ_TOKEN")" "${API}/business/badge-requests"
fi

# ─────────────────────────────────────────────────────────────────────────────
# 9. SUPPORT
# ─────────────────────────────────────────────────────────────────────────────
header "9. Support"

check "POST /api/support/contact" "200" \
  -X POST "${API}/support/contact" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","message":"Systems test — please ignore."}'

# ─────────────────────────────────────────────────────────────────────────────
# 10. CUSTOMER AUTH + PROFILE
# ─────────────────────────────────────────────────────────────────────────────
header "10. Customer Auth + Profile"

if [[ -z "$CUST_EMAIL" || -z "$CUST_PASSWORD" ]]; then
  skip "CUST_EMAIL / CUST_PASSWORD not set"
else
  check_capture "POST /api/customers/auth/login" "200" cust_login \
    -X POST "${API}/customers/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"${CUST_EMAIL}\",\"password\":\"${CUST_PASSWORD}\"}"

  CUST_TOKEN=$(echo "$cust_login" | jq -r '.token // empty' 2>/dev/null)
  if [[ -n "$CUST_TOKEN" ]]; then
    ok "Customer JWT received"

    check "GET /api/customers/auth/me" "200" \
      -H "$(auth_header "$CUST_TOKEN")" "${API}/customers/auth/me"

    check "GET /api/customers/profile" "200" \
      -H "$(auth_header "$CUST_TOKEN")" "${API}/customers/profile"

    check "GET /api/customers/favorites" "200" \
      -H "$(auth_header "$CUST_TOKEN")" "${API}/customers/favorites"
  else
    fail "Customer JWT missing"
  fi
fi

# ─────────────────────────────────────────────────────────────────────────────
# 11. ADMIN AUTH + DASHBOARD
# ─────────────────────────────────────────────────────────────────────────────
header "11. Admin Auth + Dashboard"

if [[ -z "$ADMIN_EMAIL" || -z "$ADMIN_PASSWORD" ]]; then
  skip "ADMIN_EMAIL / ADMIN_PASSWORD not set — skipping all admin tests"
else
  # Step 1: email + password → should get requires2fa or requires2faEnrollment
  check_capture "POST /api/admin/auth/login (step 1)" "200" admin_step1 \
    -X POST "${API}/admin/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"${ADMIN_EMAIL}\",\"password\":\"${ADMIN_PASSWORD}\"}"

  requires2fa=$(echo "$admin_step1" | jq -r '.requires2fa // empty' 2>/dev/null)
  requires_enroll=$(echo "$admin_step1" | jq -r '.requires2faEnrollment // empty' 2>/dev/null)

  if [[ "$requires_enroll" == "true" ]]; then
    info "Admin 2FA enrollment required — scan the QR in step 1 response, then set ADMIN_TOTP and re-run"
    skip "Admin 2FA enrollment needed — remaining admin tests skipped"
  elif [[ "$requires2fa" == "true" ]]; then
    if [[ -z "$ADMIN_TOTP" ]]; then
      skip "ADMIN_TOTP not set — skipping admin 2FA step and remaining admin tests"
    else
      check_capture "POST /api/admin/auth/login (step 2 TOTP)" "200" admin_final \
        -X POST "${API}/admin/auth/login" \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"${ADMIN_EMAIL}\",\"password\":\"${ADMIN_PASSWORD}\",\"totpCode\":\"${ADMIN_TOTP}\"}"

      ADMIN_TOKEN=$(echo "$admin_final" | jq -r '.token // empty' 2>/dev/null)
      if [[ -n "$ADMIN_TOKEN" ]]; then
        ok "Admin JWT received"
      else
        fail "Admin JWT missing"
      fi
    fi
  else
    ADMIN_TOKEN=$(echo "$admin_step1" | jq -r '.token // empty' 2>/dev/null)
    [[ -n "$ADMIN_TOKEN" ]] && ok "Admin JWT received (single step)" || fail "Admin JWT missing"
  fi

  if [[ -n "$ADMIN_TOKEN" ]]; then
    check "GET /api/admin/dashboard/summary" "200" \
      -H "$(auth_header "$ADMIN_TOKEN")" "${API}/admin/dashboard/summary"

    check "GET /api/admin/businesses?page=1&limit=5" "200" \
      -H "$(auth_header "$ADMIN_TOKEN")" "${API}/admin/businesses?page=1&limit=5"

    check "GET /api/admin/documents?page=1&limit=5" "200" \
      -H "$(auth_header "$ADMIN_TOKEN")" "${API}/admin/documents?page=1&limit=5"

    check "GET /api/admin/admins" "200" \
      -H "$(auth_header "$ADMIN_TOKEN")" "${API}/admin/admins"

    check "GET /api/badges (admin)" "200" \
      -H "$(auth_header "$ADMIN_TOKEN")" "${API}/badges"

    check "GET /api/admin/badge-requests" "200" \
      -H "$(auth_header "$ADMIN_TOKEN")" "${API}/admin/badge-requests"

    # Backup code regeneration
    check "POST /api/admin/auth/backup-codes/regenerate" "200" \
      -X POST "${API}/admin/auth/backup-codes/regenerate" \
      -H "$(auth_header "$ADMIN_TOKEN")"

    # Unauthenticated admin access should be blocked
    check "GET /api/admin/businesses (no token) → 401" "401" \
      "${API}/admin/businesses"

    # Logout
    check "POST /api/admin/auth/logout" "200" \
      -X POST "${API}/admin/auth/logout" \
      -H "$(auth_header "$ADMIN_TOKEN")"
  fi
fi

# ─────────────────────────────────────────────────────────────────────────────
# 12. AUTH SECURITY CHECKS
# ─────────────────────────────────────────────────────────────────────────────
header "12. Auth Security Checks"

# Missing fields
check "POST /api/auth/login (no body) → 400" "400" \
  -X POST "${API}/auth/login" \
  -H "Content-Type: application/json" \
  -d '{}'

check "POST /api/customers/auth/login (no body) → 400" "400" \
  -X POST "${API}/customers/auth/login" \
  -H "Content-Type: application/json" \
  -d '{}'

# Protected route without token
check "GET /api/nfc/devices (no token) → 401" "401" \
  "${API}/nfc/devices"

# Invalid token
check "GET /api/auth/me (bad token) → 401" "401" \
  -H "Authorization: Bearer not.a.real.token" "${API}/auth/me"

# ─────────────────────────────────────────────────────────────────────────────
# 13. LOGOUT (clean up tokens)
# ─────────────────────────────────────────────────────────────────────────────
header "13. Logout"

if [[ -n "$BIZ_TOKEN" ]]; then
  check "POST /api/auth/logout (business)" "200" \
    -X POST "${API}/auth/logout" \
    -H "$(auth_header "$BIZ_TOKEN")"
else
  skip "No business token to logout"
fi

if [[ -n "$CUST_TOKEN" ]]; then
  check "POST /api/customers/auth/logout" "200" \
    -X POST "${API}/customers/auth/logout" \
    -H "$(auth_header "$CUST_TOKEN")"
else
  skip "No customer token to logout"
fi

# ─────────────────────────────────────────────────────────────────────────────
# SUMMARY
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}══════════════════════════════════════════${RESET}"
echo -e "${BOLD}  Results: ${GREEN}${PASS} passed${RESET}  ${RED}${FAIL} failed${RESET}  ${YELLOW}${SKIP} skipped${RESET}"
echo -e "${BOLD}══════════════════════════════════════════${RESET}"

if [[ $FAIL -gt 0 ]]; then
  exit 1
fi
