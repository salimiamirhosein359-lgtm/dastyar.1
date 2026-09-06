#!/bin/bash
echo "=== Login ==="
TOKEN=$(curl -s http://localhost:5000/api/auth/login -H 'Content-Type: application/json' -d '{"email":"testproxy@test.com","password":"Test1234!"}' | python3 -c "import sys,json; print(json.load(sys.stdin).get('token',''))")
echo "TOKEN: ${TOKEN:0:20}..."

echo "=== Create Conversation ==="
CONV=$(curl -s http://localhost:5000/api/conversations -H "Authorization: Bearer $TOKEN" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['conversations'][0]['id'] if d.get('conversations') else '')")
echo "CONV: $CONV"

echo "=== Stream Test with Web Search ==="
curl -s -N --max-time 30 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content":"اینترنت بگرد هوش مصنوعی","model":"qwen3-8b"}' \
  "http://localhost:5000/api/chat/stream/$CONV" 2>&1 | head -20

echo ""
echo "=== DONE ==="
