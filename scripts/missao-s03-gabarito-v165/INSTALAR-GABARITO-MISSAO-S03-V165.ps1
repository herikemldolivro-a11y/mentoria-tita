# MT_TITA_MISSAO_S03_INSTALLER_V165
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
try { [Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12 } catch {}
function IsTita([string]$folder){
 if(-not $folder){return $false}
 return (Test-Path -LiteralPath (Join-Path $folder 'package.json')) -and
        (Test-Path -LiteralPath (Join-Path $folder 'private\simulados-pmal\manifest.json'))
}
$project=(Get-Location).Path
if(-not (IsTita $project)){
 $known=Join-Path $HOME 'Documents\Codex\2026-08-31\omo-conecto-meu-githuba-aq-x20\mentoria-tita'
 if(IsTita $known){$project=$known}
 else{throw 'Não localizei a pasta mentoria-tita. Abra o PowerShell no projeto.'}
}
if(-not (Get-Command node -ErrorAction SilentlyContinue)){throw 'Node.js não encontrado.'}
$url='https://raw.githubusercontent.com/herikemldolivro-a11y/mentoria-tita/tita-ingles-rotina-v160-20261110/scripts/missao-s03-gabarito-v165/aplicar-gabarito-missao-s03-v165.cjs?v=20261118-v165r1'
$tmp=Join-Path $env:TEMP ('tita-missao-s03-'+[guid]::NewGuid().ToString('N')+'.cjs')
try{
 Write-Host ('[TITÃ MISSÃO S03] Aplicando gabaritos comentados em '+$project) -ForegroundColor Cyan
 Invoke-WebRequest -Uri $url -UseBasicParsing -Headers @{'Cache-Control'='no-cache'} -OutFile $tmp
 $source=Get-Content -LiteralPath $tmp -Encoding UTF8 -Raw
 if(-not $source.Contains('MT_TITA_MISSAO_S03_120_GABARITOS_COMENTADOS_V165')){
  throw 'O instalador baixado não passou na verificação de integridade.'
 }
 Push-Location $project
 try{
   & node $tmp $project
   if($LASTEXITCODE -ne 0){throw ('Instalação falhou (código '+$LASTEXITCODE+'). Veja o erro acima.')}
 }finally{Pop-Location}
 Write-Host ''
 Write-Host '[TITÃ] 120/120 gabaritos e comentários do Dia 09 instalados. Fonte NÃO OFICIAL.' -ForegroundColor Green
 Write-Host '[TITÃ] Se o Next.js já estiver rodando, pressione Ctrl+F5.' -ForegroundColor Green
}catch{
 Write-Host '[TITÃ] O catálogo original foi preservado caso a validação tenha falhado.' -ForegroundColor Yellow
 throw
}finally{
 Remove-Item -LiteralPath $tmp -Force -ErrorAction SilentlyContinue
}