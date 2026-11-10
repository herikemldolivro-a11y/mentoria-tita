$ErrorActionPreference='Stop'
$ProgressPreference='SilentlyContinue'
try {[Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12}catch{}
function Info([string]$m){Write-Host ('[TITA INGLES V16.0] '+$m) -ForegroundColor Cyan}
function ValidProject([string]$p){
 return ($p -and (Test-Path -LiteralPath (Join-Path $p 'package.json')) -and
  (Test-Path -LiteralPath (Join-Path $p 'components\english-hub.tsx')) -and
  (Test-Path -LiteralPath (Join-Path $p 'components\principal-calendar.tsx')))
}
$project=(Get-Location).Path
if(!(ValidProject $project)){
 $known=Join-Path $HOME 'Documents\Codex\2026-08-31\omo-conecto-meu-githuba-aq-x20\mentoria-tita'
 if(ValidProject $known){$project=$known}else{throw 'Abra o PowerShell na pasta mentoria-tita. Nao foi alterado nada.'}
}
if(!(Get-Command node -ErrorAction SilentlyContinue)){throw 'Node.js nao encontrado. Nenhum arquivo alterado.'}
Info ('Pasta encontrada: '+$project)
Info 'Preparando 2 textos/dia, palavras D+2/4/7, frases favoritas e prioridade no calendario.'
$assets=Join-Path $env:TEMP ('tita-ingles-v160-'+[guid]::NewGuid().ToString('N'))
[IO.Directory]::CreateDirectory($assets)|Out-Null
$root='https://raw.githubusercontent.com/herikemldolivro-a11y/mentoria-tita/tita-ingles-rotina-v160-20261110/'
$files=@(
 [PSCustomObject]@{Remote='components/english-daily-routine-v160.tsx';Name='english-daily-routine-v160.tsx';Marker='MT_ENGLISH_ROUTINE_V160'},
 [PSCustomObject]@{Remote='components/english-calendar-priority-v160.tsx';Name='english-calendar-priority-v160.tsx';Marker='MT_ENGLISH_CALENDAR_PRIORITY_V160'},
 [PSCustomObject]@{Remote='app/ingles/rotina/page.tsx';Name='english-routine-page-v160.tsx';Marker='EnglishDailyRoutine'},
 [PSCustomObject]@{Remote='app/api/ingles/frases/route.ts';Name='english-ai-route-v160.ts';Marker='OPENAI_API_KEY'},
 [PSCustomObject]@{Remote='scripts/ingles-rotina-v160/patch-english-v160.cjs';Name='patch-english-v160.cjs';Marker='MT_ENGLISH_PATCH_V160'},
 [PSCustomObject]@{Remote='scripts/ingles-rotina-v160/install-english-v160.cjs';Name='install-english-v160.cjs';Marker='MT_ENGLISH_INSTALL_V160'}
)
try{
 foreach($file in $files){
  $wc=New-Object System.Net.WebClient
  $wc.Encoding=[System.Text.Encoding]::UTF8
  $wc.Headers.Add('Cache-Control','no-cache')
  try{$body=$wc.DownloadString($root+$file.Remote+'?v=20261110-v160r2')}
  finally{$wc.Dispose()}
  if(!$body.Contains($file.Marker) -or $body.Length -lt 100){throw ('Arquivo nao passou na verificacao: '+$file.Name)}
  [IO.File]::WriteAllText((Join-Path $assets $file.Name),$body,(New-Object System.Text.UTF8Encoding($false)))
  Info ('Recebido: '+$file.Name)
 }
 Push-Location $project
 try{
  & node (Join-Path $assets 'install-english-v160.cjs') $project $assets
  if($LASTEXITCODE -ne 0){throw ('A instalacao foi cancelada; codigo '+$LASTEXITCODE)}
 }finally{Pop-Location}
 Write-Host '[TITA INGLES V16.0] Pronto. Abra http://localhost:3000/ingles/rotina' -ForegroundColor Green
}finally{
 try{Remove-Item -LiteralPath $assets -Recurse -Force -ErrorAction SilentlyContinue}catch{}
}
