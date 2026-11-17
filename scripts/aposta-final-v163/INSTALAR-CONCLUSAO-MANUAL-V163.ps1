# MT_APOSTA_FINAL_MANUAL_COMPLETE_PS_V163
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
try { [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 } catch {}
function IsTita([string]$folder) {
  if (-not $folder) { return $false }
  return (Test-Path -LiteralPath (Join-Path $folder 'package.json')) -and
         (Test-Path -LiteralPath (Join-Path $folder 'components\aposta-final-experience.tsx'))
}
$project = (Get-Location).Path
if (-not (IsTita $project)) {
  $known = Join-Path $HOME 'Documents\Codex\2026-08-31\omo-conecto-meu-githuba-aq-x20\mentoria-tita'
  if (IsTita $known) { $project = $known }
  else { throw 'Pasta da TITÃ não localizada. Abra o PowerShell na pasta mentoria-tita.' }
}
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'Node.js não está disponível no PowerShell.' }
if (-not (Test-Path -LiteralPath (Join-Path $project 'node_modules\typescript'))) {
  throw 'TypeScript não encontrado na TITÃ. Execute npm.cmd install dentro do projeto.'
}
$url = 'https://raw.githubusercontent.com/herikemldolivro-a11y/mentoria-tita/tita-ingles-rotina-v160-20261110/scripts/aposta-final-v163/instalar-conclusao-manual-v163.cjs?v=20261117-v163r1'
$tmp = Join-Path $env:TEMP ('tita-aposta-conclusao-'+[guid]::NewGuid().ToString('N')+'.cjs')
try {
  Write-Host ('[TITÃ] Instalando botão de conclusão manual em '+$project) -ForegroundColor Cyan
  Invoke-WebRequest -Uri $url -UseBasicParsing -OutFile $tmp -Headers @{'Cache-Control'='no-cache'}
  $content = Get-Content -LiteralPath $tmp -Raw -Encoding UTF8
  if (-not $content.Contains('MT_APOSTA_FINAL_MANUAL_COMPLETE_INSTALL_V163')) {
    throw 'O instalador baixado não passou na verificação de integridade.'
  }
  Push-Location $project
  try {
    & node $tmp $project
    if ($LASTEXITCODE -ne 0) { throw ('Instalação interrompida, código '+$LASTEXITCODE+'. Leia o erro acima.') }
  } finally { Pop-Location }
  Write-Host ''
  Write-Host '[TITÃ] Pronto! Se o npm.cmd run dev estiver aberto, basta Ctrl+F5.' -ForegroundColor Green
  Write-Host '[TITÃ] Caso contrário, inicie a TITÃ com npm.cmd run dev.' -ForegroundColor Yellow
} finally {
  Remove-Item -LiteralPath $tmp -Force -ErrorAction SilentlyContinue
}
