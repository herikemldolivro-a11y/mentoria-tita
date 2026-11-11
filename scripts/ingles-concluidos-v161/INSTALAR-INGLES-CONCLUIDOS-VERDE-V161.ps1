$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
try {[Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12} catch {}
function IsTita([string]$folder) {
  if (-not $folder) { return $false }
  return (Test-Path -LiteralPath (Join-Path $folder 'package.json')) -and (Test-Path -LiteralPath (Join-Path $folder 'components\english-week-screen.tsx'))
}
$project=(Get-Location).Path
if (-not (IsTita $project)) {
  $known=Join-Path $HOME 'Documents\Codex\2026-08-31\omo-conecto-meu-githuba-aq-x20\mentoria-tita'
  if (IsTita $known) {$project=$known}
  else {throw 'Não encontrei a pasta da TITÃ. Execute dentro da pasta mentoria-tita.'}
}
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {throw 'Node.js não encontrado no PowerShell.'}
$src='https://raw.githubusercontent.com/herikemldolivro-a11y/mentoria-tita/tita-ingles-rotina-v160-20261110/scripts/ingles-concluidos-v161/pintar-concluidos-v161.cjs?v=20261111-v161r1'
$tmp=Join-Path $env:TEMP ('tita-ingles-concluidos-'+[guid]::NewGuid().ToString('N')+'.cjs')
try {
  Write-Host ('[TITÃ] Aplicando destaque verde em '+$project) -ForegroundColor Cyan
  Invoke-WebRequest -UseBasicParsing -Uri $src -OutFile $tmp -Headers @{'Cache-Control'='no-cache'}
  $text=Get-Content -LiteralPath $tmp -Raw -Encoding UTF8
  if (-not $text.Contains('MT_ENGLISH_COMPLETED_GREEN_INSTALL_V161')) {throw 'Falha na validação da correção baixada.'}
  Push-Location $project
  try {
    & node $tmp $project
    if ($LASTEXITCODE -ne 0) {throw "Erro ao instalar a correção. Código $LASTEXITCODE"}
  } finally {Pop-Location}
  Write-Host ''
  Write-Host '[TITÃ] Pronto! Com o servidor ligado, basta Ctrl+F5.' -ForegroundColor Green
} finally {
  Remove-Item -LiteralPath $tmp -Force -ErrorAction SilentlyContinue
}
