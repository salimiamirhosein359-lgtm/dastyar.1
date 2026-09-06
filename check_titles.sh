#!/bin/bash
PGPASSWORD=dastyar123 psql -h localhost -U dastyar -d dastyar_db -c "SELECT id, title, \"createdAt\" FROM \"Conversation\" ORDER BY \"createdAt\" DESC LIMIT 10;"
