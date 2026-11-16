$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $projectRoot
$portableNode = Join-Path $projectRoot '.tools/node-v24.22.3-win-x64'
if (Test-Path -LiteralPath $portableNode) { $env:PATH = "$portableNode;$env:PATH" }
# Trust the Windows certificate store as well as Node's bundled roots.
# This preserves TLS verification on managed laptops with enterprise CAs.
$env:NODE_USE_SYSTEM_CA = '1'
npm.cmd run dev
