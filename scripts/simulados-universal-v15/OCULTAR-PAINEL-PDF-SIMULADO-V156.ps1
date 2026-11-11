$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
try { [Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12 } catch {}
function IsTita([string]$folder) {
  if (-not $folder) { return $false }
  return (Test-Path -LiteralPath (Join-Path $folder 'package.json')) -and
         (Test-Path -LiteralPath (Join-Path $folder 'components\simulado-exam-runner.tsx'))
}
$project=(Get-Location).Path
if (-not (IsTita $project)) {
  $known=Join-Path $HOME 'Documents\Codex\2026-08-31\omo-conecto-meu-githuba-aq-x20\mentoria-tita'
  if (IsTita $known) { $project=$known }
  else { throw 'Não encontrei a pasta da TITÃ. Abra o PowerShell na pasta mentoria-tita.' }
}
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'Node.js não encontrado.' }
$uri='https://raw.githubusercontent.com/herikemldolivro-a11y/mentoria-tita/tita-ingles-rotina-v160-20261110/scripts/simulados-universal-v15/hide-simulado-pdf-v156.cjs?v=20261111-v156r1'
$tmp=Join-Path $env:TEMP ('tita-hide-pdf-'+[guid]::NewGuid().ToString('N')+'.cjs')
try {
  Write-Host '[TITÃ] Removendo apenas o painel PDF à direita...' -ForegroundColor Cyan
  Invoke-WebRequest -UseBasicParsing -Uri $uri -OutFile $tmp -Headers @{'Cache-Control'='no-cache'}
  $code=Get-Content -LiteralPath $tmp -Raw -Encoding UTF8
  if (-not $code.Contains('MT_SIMULADO_HIDE_ORIGINAL_PDF_INSTALL_V156')) { throw 'Arquivo de correção inválido.' }
  Push-Location $project
  try {
    & node $tmp $project
    if ($LASTEXITCODE -ne 0) { throw "A validação da correção falhou (código $LASTEXITCODE)." }
  } finally { Pop-Location }
  Write-Host ''
  Write-Host '[TITÃ] Correção pronta. Volte ao navegador e pressione Ctrl+F5.' -ForegroundColor Green
} finally {
  Remove-Item -LiteralPath $tmp -Force -ErrorAction SilentlyContinue
}
