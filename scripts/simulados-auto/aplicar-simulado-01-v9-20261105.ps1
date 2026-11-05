$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"
try { [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 } catch {}

function Info([string]$t) { Write-Host ("[TITA] " + $t) -ForegroundColor Cyan }
function IsProject([string]$p) {
  return ($p -and (Test-Path -LiteralPath (Join-Path $p "package.json")) -and (Test-Path -LiteralPath (Join-Path $p "components")))
}
function FindProject {
  $possibles = @(
    (Get-Location).Path,
    (Join-Path $env:USERPROFILE "Documents\Codex\2026-08-31\omo-conecto-meu-githuba-aq-x20\mentoria-tita"),
    (Join-Path $env:USERPROFILE "Documents\mentoria-tita"),
    (Join-Path $env:USERPROFILE "Desktop\mentoria-tita"),
    (Join-Path $env:USERPROFILE "Downloads\mentoria-tita")
  )
  foreach($p in $possibles) { if(IsProject $p){ return $p } }
  foreach($base in @((Join-Path $env:USERPROFILE "Documents"),(Join-Path $env:USERPROFILE "Desktop"))) {
    if(!(Test-Path -LiteralPath $base)){continue}
    $dirs = @(Get-ChildItem -LiteralPath $base -Recurse -Directory -Filter "mentoria-tita" -ErrorAction SilentlyContinue)
    foreach($d in $dirs){ if(IsProject $d.FullName){return $d.FullName} }
  }
  return $null
}

function GetText([string]$file) {
  $url = "https://raw.githubusercontent.com/herikemldolivro-a11y/mentoria-tita/tita-simulados-instala-auto-7-dias/scripts/simulados-auto/" + $file + "?v=20261105-9-35"
  $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 90 -Headers @{"Cache-Control"="no-cache"}
  if($response.StatusCode -ne 200){throw "Nao consegui acessar o arquivo "+$file}
  return [string]$response.Content
}
function WriteUtf8([string]$path,[string]$content) {
  $directory = Split-Path -Parent $path
  if(!(Test-Path -LiteralPath $directory)){New-Item -ItemType Directory -Force -Path $directory | Out-Null}
  if(Test-Path -LiteralPath $path){
    $old = [IO.File]::ReadAllText($path)
    if($old -eq $content){return}
    $relative = $path.Substring($script:project.Length).TrimStart('\')
    $backup = Join-Path $script:backup $relative
    New-Item -ItemType Directory -Force -Path (Split-Path -Parent $backup) | Out-Null
    Copy-Item -LiteralPath $path -Destination $backup -Force
  }
  [IO.File]::WriteAllText($path,$content,(New-Object System.Text.UTF8Encoding($false)))
}


Info "ATUALIZACAO V9 - SIMULADO 01 - ENUNCIADOS DAS 35 QUESTOES"
$project=FindProject
if(!$project){throw "Pasta mentoria-tita nao localizada. Abra o terminal dentro da pasta do projeto e execute o MESMO comando."}
Info ("Projeto: "+$project)
$target=Join-Path $project "components\simulado-exam-runner.tsx"
if(!(Test-Path -LiteralPath $target)){throw "O modulo de resolucao dos simulados nao esta instalado nesta pasta. Atualize primeiro a TITÃ para V8."}
$manifest=Join-Path $project "private\simulados-pmal\manifest.json"
if(!(Test-Path -LiteralPath $manifest)){throw "O Simulado 01 nao esta instalado nesta pasta. Nada foi alterado."}
$backup=Join-Path $project (".tita-backups\simulado-01-enunciados-v9-"+(Get-Date -Format "yyyyMMdd-HHmmss"))
Info "Baixando SOMENTE o componente de resolucao atualizado..."
$runner=GetText "simulado-exam-runner.tsx"
if(!$runner.Contains("MT_SIMULADO_01_COMPLETE_TEXTS_V9") -or !$runner.Contains("mt_simulado_question_texts") -or !$runner.Contains("displayEnunciado")){
  throw "O arquivo baixado nao e a atualizacao V9 correta. Nenhum arquivo foi alterado."
}
WriteUtf8 $target $runner
$installed=[IO.File]::ReadAllText($target)
if(!$installed.Contains("MT_SIMULADO_01_COMPLETE_TEXTS_V9")){throw "Falha ao verificar o componente instalado."}
Info "Sucesso: tela do Simulado 01 preparada para buscar 35 enunciados completos no Supabase."
Info "Apenas o componente de resolucao foi atualizado, com backup. Os PDFs, gabaritos, calendario e outras provas nao foram alterados."
$running=$false
try {
  $tcp=New-Object System.Net.Sockets.TcpClient
  $ar=$tcp.BeginConnect("127.0.0.1",3000,$null,$null)
  if($ar.AsyncWaitHandle.WaitOne(1200,$false)) { $tcp.EndConnect($ar); $running=$true }
  $tcp.Close()
} catch {}
if(!$running){
  if(!(Get-Command node -ErrorAction SilentlyContinue)){throw "Node.js nao encontrado. Abra o terminal em que voce costuma iniciar a TITÃ e rode npm.cmd run dev."}
  Start-Process -FilePath "cmd.exe" -ArgumentList "/k","npm.cmd run dev" -WorkingDirectory $project
  Start-Sleep -Seconds 3
}
Info "Abrindo Q002 do Simulado 01 para testar..."
Start-Process "http://localhost:3000/estudos/simulados?tab=calendario&data=2026-11-07&simulado=dia-01-geral"
