#!/usr/bin/env pwsh
# Replace hardcoded proxy credentials in git history
$ErrorActionPreference = "Stop"

# Create a temp script for git filter-branch
$script = @'
$files = @(
    "backend/src/services/ai.service.js",
    "backend/src/services/search.service.js"
)
foreach ($f in $files) {
    if (Test-Path $f) {
        $content = [System.IO.File]::ReadAllText($f)
        $content = $content.Replace('a2epfq5ugq0u', 'REDACTED_USER')
        $content = $content.Replace('ptkx3fqg6v7n', 'REDACTED_PASS')
        [System.IO.File]::WriteAllText($f, $content)
    }
}
'@

Set-Content -Path "filter_script.ps1" -Value $script

Write-Host "Running git filter-branch..."
FILTER_BRANCH_SQUELCH_WARNING=1 git filter-branch --tree-filter "pwsh -File filter_script.ps1" -- --all

Remove-Item -Path "filter_script.ps1" -ErrorAction SilentlyContinue

Write-Host "Done. Check with: git log --all --oneline"
