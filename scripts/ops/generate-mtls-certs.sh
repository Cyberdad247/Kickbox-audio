#!/usr/bin/env bash
# scripts/ops/generate-mtls-certs.sh
#
# v1.2.0 T3.5: mTLS cert generation for the Tailscale MCP guard.
#
# Generates a self-signed CA + server cert + client cert via openssl.
# Output: ./certs/{ca,server,client}{,-key}.pem
#
# Usage:
#   bash scripts/ops/generate-mtls-certs.sh           # 1-year validity
#   DAYS=3650 bash scripts/ops/generate-mtls-certs.sh # 10-year validity
#   CN=mcp.example.com bash scripts/ops/generate-mtls-certs.sh
#
# The mcp-query server uses MTLS_SERVER_CERT + MTLS_SERVER_KEY.
# The Bifrost client uses MTLS_CA_CERT (to verify the server) +
# MTLS_CLIENT_CERT (if the server requires client cert auth).
#
# Production note: for public-facing deployments, replace this self-
# signed CA with a Tailscale-managed cert or Let's Encrypt. This
# script is intended for the Tailscale mesh where peer certs are
# pre-distributed.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
CERT_DIR="${ROOT}/certs"
DAYS="${DAYS:-365}"
CA_CN="${CA_CN:-Kickbox Audio mTLS CA}"
SERVER_CN="${SERVER_CN:-mcp-query.ts.net}"
CLIENT_CN="${CLIENT_CN:-bifrost-client.ts.net}"

mkdir -p "$CERT_DIR"

echo "[mtls] output dir: $CERT_DIR"
echo "[mtls] validity:    $DAYS days"
echo "[mtls] CA CN:       $CA_CN"
echo "[mtls] server CN:   $SERVER_CN"
echo "[mtls] client CN:   $CLIENT_CN"

# --- 1. CA private key + self-signed cert ---
if [ ! -f "$CERT_DIR/ca-key.pem" ]; then
  echo "[mtls] generating CA key + cert"
  openssl genrsa -out "$CERT_DIR/ca-key.pem" 4096
  openssl req -new -x509 -days "$DAYS" -key "$CERT_DIR/ca-key.pem" \
    -out "$CERT_DIR/ca.pem" \
    -subj "/CN=$CA_CN/O=Kickbox Audio"
else
  echo "[mtls] reusing existing CA: $CERT_DIR/ca-key.pem"
fi

# --- 2. Server private key + CSR + signed cert ---
if [ ! -f "$CERT_DIR/server-key.pem" ]; then
  echo "[mtls] generating server key + cert"
  openssl genrsa -out "$CERT_DIR/server-key.pem" 2048
  openssl req -new -key "$CERT_DIR/server-key.pem" \
    -out "$CERT_DIR/server.csr" \
    -subj "/CN=$SERVER_CN/O=Kickbox Audio"
  openssl x509 -req -in "$CERT_DIR/server.csr" \
    -CA "$CERT_DIR/ca.pem" -CAkey "$CERT_DIR/ca-key.pem" \
    -CAcreateserial -out "$CERT_DIR/server.pem" \
    -days "$DAYS" \
    -extfile <(printf "subjectAltName=DNS:%s,DNS:localhost,IP:127.0.0.1\n" "$SERVER_CN")
  rm "$CERT_DIR/server.csr"
else
  echo "[mtls] reusing existing server cert: $CERT_DIR/server-key.pem"
fi

# --- 3. Client private key + CSR + signed cert (for mutual auth) ---
if [ ! -f "$CERT_DIR/client-key.pem" ]; then
  echo "[mtls] generating client key + cert"
  openssl genrsa -out "$CERT_DIR/client-key.pem" 2048
  openssl req -new -key "$CERT_DIR/client-key.pem" \
    -out "$CERT_DIR/client.csr" \
    -subj "/CN=$CLIENT_CN/O=Kickbox Audio"
  openssl x509 -req -in "$CERT_DIR/client.csr" \
    -CA "$CERT_DIR/ca.pem" -CAkey "$CERT_DIR/ca-key.pem" \
    -CAcreateserial -out "$CERT_DIR/client.pem" \
    -days "$DAYS"
  rm "$CERT_DIR/client.csr"
else
  echo "[mtls] reusing existing client cert: $CERT_DIR/client-key.pem"
fi

# --- 4. Lock down private keys ---
chmod 600 "$CERT_DIR"/{ca,server,client}-key.pem
chmod 644 "$CERT_DIR"/{ca,server,client}.pem

echo "[mtls] generated:"
ls -la "$CERT_DIR"
echo
echo "[mtls] verify cert chain:"
openssl verify -CAfile "$CERT_DIR/ca.pem" "$CERT_DIR/server.pem" "$CERT_DIR/client.pem"
echo
echo "[mtls] next steps:"
echo "  1. Set MTLS_ENABLED=true in .env.local"
echo "  2. Set MTLS_CA_CERT_PATH=./certs/ca.pem"
echo "  3. Set MTLS_SERVER_CERT_PATH=./certs/server.pem"
echo "  4. Set MTLS_SERVER_KEY_PATH=./certs/server-key.pem"
echo "  5. Set MTLS_REQUIRE_CLIENT_CERT=true (for mutual auth)"
echo "  6. Add ./certs to .gitignore (already done in v1.1.0)"
