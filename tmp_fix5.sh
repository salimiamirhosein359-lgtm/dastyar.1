#!/bin/bash
echo "1. Installing poppler-utils..."
apt-get install -y poppler-utils 2>&1 | tail -5
echo "2. Testing pdftotext..."
which pdftotext 2>&1
pdftotext -v 2>&1 | head -2
echo "=== DONE ==="
