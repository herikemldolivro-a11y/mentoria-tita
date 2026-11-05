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
function FindZip {
  $bases = @((Join-Path $env:USERPROFILE "Downloads"),(Join-Path $env:USERPROFILE "Desktop"),(Join-Path $env:USERPROFILE "Documents"),$script:project)
  $patterns = @("TITA_TODOS_7_DIAS_INSTALACAO_UNICA.zip","TITA_SIMULADOS_SEMANA_01.zip","SIMULADOS_PMAL_DIAS_01_A_07*.zip")
  foreach($pattern in $patterns) {
    foreach($base in $bases) {
      if(!(Test-Path -LiteralPath $base)){continue}
      $found = @(Get-ChildItem -Path (Join-Path $base $pattern) -File -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending)
      if($found.Count -gt 0) {return $found[0]}
    }
  }
  foreach($pattern in $patterns) {
    foreach($base in $bases) {
      if(!(Test-Path -LiteralPath $base)){continue}
      $found = @(Get-ChildItem -LiteralPath $base -Recurse -File -Filter $pattern -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending)
      if($found.Count -gt 0) {return $found[0]}
    }
  }
  return $null
}
function GetText([string]$file) {
  $url = "https://raw.githubusercontent.com/herikemldolivro-a11y/mentoria-tita/tita-simulados-instala-auto-7-dias/scripts/simulados-auto/" + $file + "?v=20261105-6"
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
function CopyOriginal([string]$src,[string]$dest) {
  if(!(Test-Path -LiteralPath $src)){throw "PDF ausente no ZIP: "+$src}
  if(Test-Path -LiteralPath $dest){
    $s=(Get-Item -LiteralPath $src).Length
    $d=(Get-Item -LiteralPath $dest).Length
    if($s -eq $d){return}
    $backup=Join-Path $script:backup ("PDFs\"+[IO.Path]::GetFileName($dest))
    New-Item -ItemType Directory -Force -Path (Split-Path -Parent $backup) | Out-Null
    Copy-Item -LiteralPath $dest -Destination $backup -Force
  }
  Copy-Item -LiteralPath $src -Destination $dest -Force
}


Info "INSTALADOR V6 - RESOLUCAO REAL DE QUESTOES - 05/11/2026"
Info "Atualizando a resolucao das questoes, anotacoes e o calendario principal..."
$project=FindProject
if(!$project){throw "Nao localizei mentoria-tita. Execute na pasta do projeto."}
$backup=Join-Path $project (".tita-backups\simulado-resolucao-v6-"+(Get-Date -Format "yyyyMMdd-HHmmss"))
Info ("Projeto: "+$project)
$manifest=Join-Path $project "private\simulados-pmal\manifest.json"
if(!(Test-Path -LiteralPath $manifest)){throw "Os simulados nao estao instalados nesta pasta. Execute o instalador da Semana 01 primeiro."}
$pdf=Join-Path $project "private\simulados-pmal\pdfs\dia-01-geral-prova.pdf"
if(!(Test-Path -LiteralPath $pdf)){throw "PDFs originais ausentes. Instalacao cancelada."}
Info "Baixando atualizacoes do codigo..."
$srcMain=GetText "estudos-simulados.tsx"
$srcRunner=GetText "simulado-exam-runner.tsx"
$srcRoute=GetText "catalog-route.ts"
$patch=ConvertFrom-Json -InputObject (GetText "calendar-bridge-v6.json")
if(!$srcMain.Contains("SimuladoExamRunner") -or $srcMain.Contains("Respondi CERTO")){
  throw "O modulo atualizado nao foi baixado corretamente. Instalacao cancelada."
}
if(!$srcRunner.Contains("Corrigir resposta") -or !$srcRunner.Contains("mt_simulado_question_notes")){
  throw "O arquivo da nova resolucao esta incompleto. Instalacao cancelada."
}
if(@($patch.patches).Count -ne 11){throw "O pacote do calendario nao esta completo."}
$calendarPath=Join-Path $project "components\principal-calendar.tsx"
if(!(Test-Path -LiteralPath $calendarPath)){throw "Calendario principal nao encontrado. Instalacao cancelada."}
$calendar=[IO.File]::ReadAllText($calendarPath)
$calendar=$calendar.Replace(([string][char]13+[char]10),[string][char]10)
foreach($item in $patch.patches){
  $before=[string]$item.old
  $after=[string]$item.replacement
  if($calendar.Contains($after)){continue}
  if(!$calendar.Contains($before)){throw ("Nao localizei o trecho "+$item.id+" no calendario principal. Nada foi alterado.")}
  $calendar=$calendar.Replace($before,$after)
}
if(!$calendar.Contains("MT_SIMULADO_CALENDAR_BRIDGE_V1")){throw "Falha ao integrar calendario. Cancelado."}
Info "Instalando codigo com backup automatico..."
WriteUtf8 (Join-Path $project "components\estudos-simulados.tsx") $srcMain
WriteUtf8 (Join-Path $project "components\simulado-exam-runner.tsx") $srcRunner
WriteUtf8 (Join-Path $project "app\api\estudos\simulados\route.ts") $srcRoute
WriteUtf8 $calendarPath $calendar
Info "Instalacao da resolucao e do calendario concluida!"
Info "Enunciado no app, Certo/Errado para responder, botao Corrigir, proxima, anotacoes e agenda principal."
$running=$false
try{
 $tcp=New-Object System.Net.Sockets.TcpClient
 $ar=$tcp.BeginConnect("127.0.0.1",3000,$null,$null)
 if($ar.AsyncWaitHandle.WaitOne(1200,$false)){$tcp.EndConnect($ar);$running=$true}
 $tcp.Close()
}catch{}
if(!$running){
  if(!(Get-Command node -ErrorAction SilentlyContinue)){throw "Node.js nao encontrado; execute npm.cmd run dev na pasta da TITÃ."}
  Start-Process -FilePath "cmd.exe" -ArgumentList "/k","npm.cmd run dev" -WorkingDirectory $project
  Start-Sleep -Seconds 4
}
Start-Process "http://localhost:3000/estudos/simulados?tab=calendario"
