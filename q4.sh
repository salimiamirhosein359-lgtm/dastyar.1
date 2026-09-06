#!/bin/bash
PGPASSWORD=dastyar123 psql -U dastyar -d dastyar_db -h localhost -c "SELECT d.id, d.title, d.status, d.\"userId\" FROM \"Document\" d ORDER BY d.created_at DESC LIMIT 5;"
