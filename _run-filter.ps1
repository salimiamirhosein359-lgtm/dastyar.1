$ErrorActionPreference = "Stop"
Set-Location "C:\Users\Dear User\OneDrive\Desktop\dastyar"
$env:FILTER_BRANCH_SQUELCH_WARNING = "1"

$cmd = 'perl -e "for my $f (qw(backend/src/services/ai.service.js backend/src/services/search.service.js)) { if (-f $f) { open(F,$f); $c=do{local $/;<F>}; close(F); $c=~s/a2epfq5ugq0u/REDACTED_USER/g; $c=~s/ptkx3fqg6v7n/REDACTED_PASS/g; open(O,>,$f); print O $c; close(O); } }"'

git filter-branch --tree-filter $cmd -- --all

Write-Host "=== DONE ==="
git log --all --oneline | Select-Object -First 10
