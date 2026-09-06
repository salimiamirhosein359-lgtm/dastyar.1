#!/bin/bash
echo "=== Login ==="
TOKEN=$(curl -s http://localhost:80/api/auth/login -H 'Content-Type: application/json' -d '{"email":"testproxy@test.com","password":"Test1234!"}' | python3 -c "import sys,json; print(json.load(sys.stdin).get('token',''))")
echo "TOKEN: ${TOKEN:0:20}..."

echo "=== Create Conversation ==="
CONV=$(curl -s http://localhost:80/api/conversations -H "Authorization: Bearer $TOKEN" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['conversations'][0]['id'] if d.get('conversations') else '')")
echo "CONV: $CONV"

echo "=== Stream via Nginx ==="
curl -s -N --max-time 30 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content":"test web search","model":"qwen3-8b"}' \
  "http://localhost:80/api/chat/stream/$CONV" 2>&1 | head -10

echo ""
echo "=== DONE ==="
