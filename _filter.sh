#!/bin/bash
cd "/c/Users/Dear User/OneDrive/Desktop/dastyar"
export FILTER_BRANCH_SQUELCH_WARNING=1

git filter-branch --tree-filter 'find backend/src/services -name "*.js" -exec sed -i -e s/a2epfq5ugq0u/REDACTED_USER/g -e s/ptkx3fqg6v7n/REDACTED_PASS/g {} +' -- --all

echo "=== DONE ==="
git log --all --oneline | head -15
