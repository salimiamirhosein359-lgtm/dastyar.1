#!/bin/bash
PGPASSWORD=dastyar123 psql -U dastyar -d dastyar_db -h localhost -c "SELECT id, title, status, userId FROM \"Document\" ORDER BY created_at DESC LIMIT 5;"
