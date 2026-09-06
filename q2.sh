#!/bin/bash
PGPASSWORD=dastyar123 psql -U dastyar -d dastyar_db -h localhost -c "SELECT id, title, status, user_id FROM \"Document\" ORDER BY created_at DESC LIMIT 5;"
PGPASSWORD=dastyar123 psql -U dastyar -d dastyar_db -h localhost -c "SELECT id, email FROM \"User\" LIMIT 5;"
