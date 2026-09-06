#!/bin/bash
PGPASSWORD=dastyar123 psql -h localhost -U dastyar -d dastyar_db -c "SELECT id, title, status, \"fileType\", \"fileSize\", length(content) as content_len FROM \"Document\" ORDER BY \"createdAt\" DESC LIMIT 5;"
PGPASSWORD=dastyar123 psql -h localhost -U dastyar -d dastyar_db -c "SELECT count(*) as chunk_count FROM \"Chunk\";"
