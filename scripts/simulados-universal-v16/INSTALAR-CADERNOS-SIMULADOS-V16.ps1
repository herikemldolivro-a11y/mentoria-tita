$ErrorActionPreference='Stop'
$ProgressPreference='SilentlyContinue'
try{[Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12}catch{}
function Info([string]$s){Write-Host ('[TITA V16] '+$s) -ForegroundColor Cyan}
function IsProject([string]$p){
 return ($p -and
  (Test-Path -LiteralPath (Join-Path $p 'package.json')) -and
  (Test-Path -LiteralPath (Join-Path $p 'app\estudos\simulados\page.tsx')) -and
  (Test-Path -LiteralPath (Join-Path $p 'components\simulado-exam-runner.tsx')) -and
  (Test-Path -LiteralPath (Join-Path $p 'components\principal-calendar.tsx')))
}
$project=(Get-Location).Path
if(!(IsProject $project)){
 $fallback=Join-Path $HOME 'Documents\Codex\2026-08-31\omo-conecto-meu-githuba-aq-x20\mentoria-tita'
 if(IsProject $fallback){$project=$fallback}
 else{throw 'Projeto TITÃ nao localizado. Abra o PowerShell na pasta mentoria-tita. Nenhum arquivo foi modificado.'}
}
if(!(Get-Command node -ErrorAction SilentlyContinue)){
 throw 'Node.js nao acessivel. Abra o PowerShell no mesmo ambiente em que inicia a TITÃ.'
}
Info ('Projeto: '+$project)
Info 'Instalando cadernos de flashcards dos simulados com revisao no dia anterior.'
$root='https://raw.githubusercontent.com/herikemldolivro-a11y/mentoria-tita/tita-simulado-flashcards-dmenos1-v16-20261110/'
$items=@(
 @{Path='scripts/simulados-universal-v16/instalar-simulado-flashcards-v16.cjs'; File='instalar-simulado-flashcards-v16.cjs'; Marker='MT_SIMULADO_NOTEBOOK_D1_INSTALLER_V16'},
 @{Path='scripts/simulados-universal-v16/simulado-flashcards.tsx'; File='simulado-flashcards.tsx'; Marker='MT_SIMULADO_FLASHCARDS_V16'},
 @{Path='scripts/simulados-universal-v16/patch-calendar-d1-v16.cjs'; File='patch-calendar-d1-v16.cjs'; Marker='MT_SIMULADO_D1_CALENDAR_PATCH_V16'},
 @{Path='scripts/simulados-universal-v15/simulado-exam-runner.tsx'; File='simulado-exam-runner.tsx'; Marker='MT_SIMULADO_D1_FLASHCARDS_V16'},
 @{Path='scripts/simulados-universal-v15/estudos-simulados.tsx'; File='estudos-simulados.tsx'; Marker='MT_SIMULADO_D1_FLASHCARDS_V16'}
)
$temp=Join-Path $env:TEMP ('tita-cadernos-simulados-v16-'+[guid]::NewGuid().ToString('N'))
[IO.Directory]::CreateDirectory($temp)|Out-Null
$oldEnv=$env:TITA_V16_ASSET_DIR
$success=$false
try{
 foreach($item in $items){
   $url=$root+$item.Path+'?v=20261110-v16r1'
   $wc=New-Object System.Net.WebClient
   $wc.Encoding=[System.Text.Encoding]::UTF8
   $wc.Headers.Add('Cache-Control','no-cache')
   try{$source=$wc.DownloadString($url)}finally{$wc.Dispose()}
   if($source.Length -lt 200 -or !$source.Contains($item.Marker)){
     throw ('Arquivo V16 invalido ou antigo: '+$item.File+'. Nenhum arquivo do projeto modificado.')
   }
   [IO.File]::WriteAllText((Join-Path $temp $item.File),$source,(New-Object System.Text.UTF8Encoding($false)))
   Info ('Verificado: '+$item.File)
 }
 $env:TITA_V16_ASSET_DIR=$temp
 $installer=Join-Path $temp 'instalar-simulado-flashcards-v16.cjs'
 Push-Location $project
 try{
  & node --check $installer
  if($LASTEXITCODE -ne 0){Info 'Erro de sintaxe no instalador; arquivos preservados.';return}
  & node $installer
  if($LASTEXITCODE -ne 0){
   Write-Host '[TITA V16] NAO INSTALADO. A causa especifica esta na linha FALHA DETALHADA acima.' -ForegroundColor Yellow
   Write-Host '[TITA V16] Se aparecer essa mensagem, envie a linha de erro exata; a instalacao protege os arquivos anteriores.' -ForegroundColor Yellow
   return
  }
  $success=$true
 }finally{Pop-Location}
}finally{
 $env:TITA_V16_ASSET_DIR=$oldEnv
 try{Remove-Item -LiteralPath $temp -Force -Recurse -ErrorAction SilentlyContinue}catch{}
}
if($success){
 Write-Host '[TITA V16] SUCESSO: caderno do simulado, prints, revisao D-1 e conclusao no calendario integrados.' -ForegroundColor Green
 Write-Host '[TITA V16] Seus flashcards de aulas, revisoes e nivelamentos anteriores foram preservados.' -ForegroundColor Green
 Info 'Pressione Ctrl+F5 e reabra o Simulado 01. O botao Caderno de Anotacoes aparecera ao lado de Sair da resolucao.'
}
