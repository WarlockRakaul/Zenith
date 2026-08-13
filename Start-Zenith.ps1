$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$serverScript = Join-Path $projectRoot 'tools\server.mjs'
$nodeCommand = Get-Command node -ErrorAction SilentlyContinue

if ($nodeCommand) {
    $nodePath = $nodeCommand.Source
} else {
    $runtimeRoot = Join-Path $env:USERPROFILE '.cache\codex-runtimes'
    $nodeCandidate = Get-ChildItem -LiteralPath $runtimeRoot -Filter node.exe -Recurse -ErrorAction SilentlyContinue |
        Where-Object { $_.FullName -like '*\dependencies\node\bin\node.exe' } |
        Select-Object -First 1
    if (-not $nodeCandidate) {
        throw 'Node.js was not found. Install Node.js 22+ or run Zenith through GitHub Pages.'
    }
    $nodePath = $nodeCandidate.FullName
}

Write-Host 'Starting Zenith on this computer and your private network...' -ForegroundColor Cyan
Write-Host 'If Windows asks about firewall access, allow Private networks.' -ForegroundColor DarkGray
& $nodePath $serverScript
