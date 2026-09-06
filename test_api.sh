#!/bin/bash
TOKEN=$(curl -s http://localhost:5000/api/auth/login -H 'Content-Type: application/json' -d '{"email":"testproxy@test.com","password":"Test1234!"}' | python3 -c 'import sys,json; print(json.load(sys.stdin)["token"])')
echo "Token: ${TOKEN:0:20}..."

CONV=$(curl -s http://localhost:5000/api/conversations -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{}' | python3 -c 'import sys,json; print(json.load(sys.stdin)["conversation"]["id"])')
echo "Conv: $CONV"

echo "--- Testing chat ---"
curl -s http://localhost:5000/api/chat/send/$CONV \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"content":"سلام، حالت چطوره؟","model":"qwen3-8b"}' 2>&1 | python3 -c 'import sys,json; d=json.load(sys.stdin); print("OK" if d.get("message") else "FAIL:", d)' 2>&1

echo "--- Testing streaming ---"
curl -s -N http://localhost:5000/api/chat/stream/$CONV \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"content":"2+2 چنده؟","model":"qwen3-8b"}' 2>&1 | head -c 800
