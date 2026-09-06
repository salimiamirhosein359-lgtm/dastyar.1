#!/bin/bash
echo "=== Installing tools ==="
apt-get update -qq 2>&1 | tail -1

# Image OCR
echo "1. Installing tesseract-ocr..."
DEBIAN_FRONTEND=noninteractive apt-get install -y -qq tesseract-ocr tesseract-ocr-fas tesseract-ocr-eng 2>&1 | tail -3

# Word documents
echo "2. Installing antiword for .doc..."
DEBIAN_FRONTEND=noninteractive apt-get install -y -qq antiword 2>&1 | tail -3

# For .docx we'll use python3-docx
echo "3. Installing python3-docx..."
pip3 install python3-docx 2>&1 | tail -3

# Audio - ffmpeg for conversion
echo "4. Installing ffmpeg..."
DEBIAN_FRONTEND=noninteractive apt-get install -y -qq ffmpeg 2>&1 | tail -3

echo "=== Testing tools ==="
echo -n "tesseract: "; tesseract --version 2>&1 | head -1
echo -n "antiword: "; antiword 2>&1 | head -1
echo -n "ffmpeg: "; ffmpeg -version 2>&1 | head -1
echo "=== DONE ==="
