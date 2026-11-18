# MT_EBN_S02_GABARITO_POWERSHELL_V164
$ErrorActionPreference='Stop'
$ProgressPreference='SilentlyContinue'
try { [Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12 } catch {}
function IsTita([string]$folder) {
 if (-not $folder) { return $false }
 return (Test-Path -LiteralPath (Join-Path $folder 'package.json')) -and
        (Test-Path -LiteralPath (Join-Path $folder 'private\simulados-pmal\manifest.json'))
}
$project=(Get-Location).Path
if (-not (IsTita $project)){
 $known=Join-Path $HOME 'Documents\Codex\2026-08-31\omo-conecto-meu-githuba-aq-x20\mentoria-tita'
 if(IsTita $known) {$project=$known}
 else{throw 'A pasta da TITÃ não foi encontrada. Abra o PowerShell na pasta mentoria-tita.'}
}
if (-not (Get-Command node -ErrorAction SilentlyContinue)){throw 'Node.js não está disponível.'}
$source='https://raw.githubusercontent.com/herikemldolivro-a11y/mentoria-tita/tita-ingles-rotina-v160-20261110/scripts/ebn-s02-gabarito-v164/aplicar-gabarito-ebn-s02-v164.cjs?v=20261117-v164r1'
$tmp=Join-Path $env:TEMP ('tita-ebn-s02-gabarito-'+[guid]::NewGuid().ToString('N')+'.cjs')
try {
 Write-Host ('[TITÃ] Importando gabaritos EBN S02 (120 questões): '+$project) -ForegroundColor Cyan
 Invoke-WebRequest -UseBasicParsing -Uri $source -OutFile $tmp -Headers @{'Cache-Control'='no-cache'}
 $content=Get-Content -LiteralPath $tmp -Raw -Encoding UTF8
 if (-not $content.Contains('MT_EBN_S02_OFFICIAL_GABARITO_V164')){
  throw 'O arquivo baixado não passou na validação de integridade.'
 }
 Push-Location $project
 try{
   & node $tmp $project
   if($LASTEXITCODE -ne 0){throw ('Correção interrompida (código '+$LASTEXITCODE+'). Veja o erro acima.')}
 }finally{Pop-Location}
 Write-Host ''
 Write-Host '[TITÃ] Os gabaritos estão no catálogo local. Com o servidor já funcionando, basta Ctrl+F5.' -ForegroundColor Green
}finally{
 Remove-Item -LiteralPath $tmp -Force -ErrorAction SilentlyContinue
}