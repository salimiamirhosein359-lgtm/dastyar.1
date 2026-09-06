#!/bin/bash
TOKEN=$(curl -s http://localhost:5000/api/auth/login -H 'Content-Type: application/json' -d '{"email":"testproxy@test.com","password":"Test1234!"}' | python3 -c 'import sys,json; print(json.load(sys.stdin)["token"])')

CONV=$(curl -s http://localhost:5000/api/conversations -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{}' | python3 -c 'import sys,json; print(json.load(sys.stdin)["conversation"]["id"])')

echo "--- Test 1: Simple question ---"
curl -s -N http://localhost:5000/api/chat/stream/$CONV \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"content":"2+2 چنده؟","model":"qwen3-8b"}' 2>&1 | head -c 1000
echo ""

echo "--- Test 2: With document ---"
DOC_ID=$(curl -s http://localhost:5000/api/documents -H "Authorization: Bearer $TOKEN" | python3 -c 'import sys,json; docs=json.load(sys.stdin).get("documents",[]); print(docs[0]["id"] if docs else "NONE")')
echo "Doc: $DOC_ID"
curl -s -N http://localhost:5000/api/chat/stream/$CONV \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{\"content\":\"این مقاله رو بخون و خلاصه کن\",\"model\":\"qwen3-8b\",\"documentIds\":[\"$DOC_ID\"]}" 2>&1 | head -c 2000
