$ErrorActionPreference="Stop"
$ProgressPreference="SilentlyContinue"
try{[Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12}catch{}
function Say([string]$s){Write-Host ("[TITA V15.1] "+$s) -ForegroundColor Cyan}
function IsProject([string]$p){
 if(!$p){return $false}
 return (Test-Path -LiteralPath (Join-Path $p 'package.json')) -and
   (Test-Path -LiteralPath (Join-Path $p 'components\simulado-exam-runner.tsx')) -and
   (Test-Path -LiteralPath (Join-Path $p 'components\principal-calendar.tsx')) -and
   (Test-Path -LiteralPath (Join-Path $p 'lib\principal-calendar-system.ts')) -and
   (Test-Path -LiteralPath (Join-Path $p 'private\simulados-pmal\manifest.json'))
}
$project=$null
$possible=@(
 (Get-Location).Path,
 (Join-Path $env:USERPROFILE 'Documents\Codex\2026-08-31\omo-conecto-meu-githuba-aq-x20\mentoria-tita'),
 (Join-Path $env:USERPROFILE 'Documents\mentoria-tita'),
 (Join-Path $env:USERPROFILE 'Desktop\mentoria-tita')
)
foreach($candidate in $possible){if(IsProject $candidate){$project=$candidate;break}}
if(!$project){throw "Nao encontrei a TITÃ com os simulados instalados. Execute na pasta mentoria-tita. Nenhum arquivo foi modificado."}
if(!(Get-Command node -ErrorAction SilentlyContinue)){throw "Node.js nao esta acessivel neste PowerShell."}
Say "TITÃ: $project"
Say "V15.1: baixando pelo PowerShell para evitar falha de rede do Node.js."
$folder=Join-Path $env:TEMP ('tita-v151-'+[guid]::NewGuid().ToString('N'))
[IO.Directory]::CreateDirectory($folder)|Out-Null
$oldEnv=$env:TITA_V15_ASSET_DIR
$success=$false
try{
 $root='https://raw.githubusercontent.com/herikemldolivro-a11y/mentoria-tita/tita-simulados-revisao-universal-v15-20261109/scripts/simulados-universal-v15/'
 $items=@('install-v15.cjs','simulado-exam-runner.tsx','estudos-simulados.tsx','patch-calendar-v151.cjs')
 foreach($item in $items){
  $wc=New-Object System.Net.WebClient
  $wc.Encoding=[System.Text.Encoding]::UTF8
  $wc.Headers.Add('Cache-Control','no-cache')
  try{$source=$wc.DownloadString($root+$item+'?v=20261109-v151r1')}
  finally{$wc.Dispose()}
  if([string]::IsNullOrWhiteSpace($source) -or $source.Length -lt 200){
    throw "Arquivo V15.1 nao carregado corretamente: $item. Nenhum arquivo TITÃ modificado."
  }
  $dest=Join-Path $folder $item
  [IO.File]::WriteAllText($dest,$source,(New-Object System.Text.UTF8Encoding($false)))
  Say ("Recebido: "+$item)
 }
 if(!(Select-String -SimpleMatch 'MT_SIMULADO_UNIVERSAL_OFFLINE_ASSETS_V151' -Quiet -Path (Join-Path $folder 'install-v15.cjs'))){
  throw "Instalador antigo recebido por cache. Nenhum arquivo TITÃ modificado."
 }
 $env:TITA_V15_ASSET_DIR=$folder
 $installer=Join-Path $folder 'install-v15.cjs'
 Push-Location $project
 try{
  & node --check $installer
  if($LASTEXITCODE -ne 0){throw "Falha de sintaxe no instalador. Arquivos preservados."}
  Say "Iniciando auditoria e instalacao com backups..."
  & node $installer
  $code=$LASTEXITCODE
  if($code -ne 0){
    Write-Host "[TITA V15.1] A instalacao nao concluiu. O motivo ESPECIFICO esta nas linhas [TITA V15] FALHA DETALHADA acima." -ForegroundColor Yellow
    Write-Host "[TITA V15.1] Se ainda falhar, envie essas linhas, nao apenas esta mensagem." -ForegroundColor Yellow
    return
  }
  $success=$true
 }finally{Pop-Location}
}finally{
 $env:TITA_V15_ASSET_DIR=$oldEnv
 try{Remove-Item -LiteralPath $folder -Force -Recurse -ErrorAction SilentlyContinue}catch{}
}
if($success){
 Write-Host "[TITA V15.1] SUCESSO: leitor de simulados e calendario integrados. Dados e cadernos preservados." -ForegroundColor Green
 Say "Pressione Ctrl+F5 no navegador."
 try{
  $response=Invoke-WebRequest -UseBasicParsing -Uri 'http://localhost:3000/estudos/simulados' -TimeoutSec 5 -ErrorAction Stop
  if($response.StatusCode -ge 200 -and $response.StatusCode -lt 400){Start-Process 'http://localhost:3000/estudos/simulados'}
 }catch{Say "Se a TITÃ nao estiver aberta, inicie com npm.cmd run dev e depois acesse /estudos/simulados."}
}
