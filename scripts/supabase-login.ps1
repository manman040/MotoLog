$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $projectRoot
$portableNode = Join-Path $projectRoot '.tools/node-v24.22.3-win-x64'
if (Test-Path -LiteralPath $portableNode) { $env:PATH = "$portableNode;$env:PATH" }
if (-not (Get-Command npx.cmd -ErrorAction SilentlyContinue)) {
    throw 'Node.js/npm is unavailable. Install Node.js 24 LTS, reopen the terminal, and try again.'
}
$env:NODE_USE_SYSTEM_CA = '1'
$env:NPM_CONFIG_OFFLINE = 'false'
# The user completes authentication directly in their browser and terminal.
# No access token or database password is placed in app environment files.
npx.cmd --yes supabase@latest login
if ($LASTEXITCODE -ne 0) { throw 'Supabase login did not complete. No migrations were applied.' }
Write-Host 'Supabase CLI login completed. Return to Codex to continue the approved deployment.'
