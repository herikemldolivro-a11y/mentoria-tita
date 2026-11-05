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
  $url = "https://raw.githubusercontent.com/herikemldolivro-a11y/mentoria-tita/tita-simulados-instala-auto-7-dias/scripts/simulados-auto/" + $file + "?v=20261105-8"
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



Info "INSTALADOR V8 - SEM PATCHES DO CALENDARIO - 05/11/2026"
Info "Atualizacao segura de simulados com resolucao e agenda conectada."
$project=FindProject
if(!$project){throw "Nao localizei o projeto mentoria-tita. Execute o comando no terminal da pasta do projeto."}
Info ("Projeto: "+$project)
$manifest=Join-Path $project "private\simulados-pmal\manifest.json"
$pdf=Join-Path $project "private\simulados-pmal\pdfs\dia-01-geral-prova.pdf"
if(!(Test-Path -LiteralPath $manifest)){throw "O modulo original da Semana 01 nao foi encontrado neste projeto."}
if(!(Test-Path -LiteralPath $pdf)){throw "As provas originais nao foram encontradas. Nenhum arquivo foi alterado."}

$backup=Join-Path $project (".tita-backups\simulado-v8-"+(Get-Date -Format "yyyyMMdd-HHmmss"))
Info "Baixando cinco arquivos pequenos, sem refazer o download dos PDFs..."
$main=GetText "estudos-simulados.tsx"
$runner=GetText "simulado-exam-runner.tsx"
$route=GetText "catalog-route.ts"
$dock=GetText "simulado-calendar-dock.tsx"
$template=GetText "calendario-template-v8.tsx"

# Validate all before writing to the user's project
if(!$main.Contains("SimuladoExamRunner") -or $main.Contains("Respondi CERTO")){throw "Nao recebi o codigo novo de resolucao; instalacao cancelada."}
if(!$runner.Contains("Corrigir resposta") -or !$runner.Contains("mt_simulado_question_notes")){throw "A resolucao completa veio incompleta; instalacao cancelada."}
if(!$dock.Contains("SimuladoCalendarDock") -or !$dock.Contains("mt_simulado_review_calendar")){throw "A agenda dos simulados veio incompleta; instalacao cancelada."}
if(!$template.Contains("MT_SIMULADO_CALENDAR_TEMPLATE_V8")){throw "Template de integracao invalido; instalacao cancelada."}
if(!$route.Contains("Array.isArray(parsed)")){throw "A rota do catalogo nao foi atualizada; instalacao cancelada."}

$calendarTemplatePath=Join-Path $project "app\calendario\template.tsx"
$calendarLayoutPath=Join-Path $project "app\calendario\layout.tsx"
$calendarPagePath=Join-Path $project "app\calendario\page.tsx"
$integrationMode=""
$pageUpdated=""

if(!(Test-Path -LiteralPath $calendarTemplatePath)){
  $integrationMode="template"
} elseif(([IO.File]::ReadAllText($calendarTemplatePath)).Contains("MT_SIMULADO_CALENDAR_TEMPLATE_V8")){
  $integrationMode="template"
} elseif(!(Test-Path -LiteralPath $calendarLayoutPath)){
  $integrationMode="layout"
} elseif(Test-Path -LiteralPath $calendarPagePath){
  $pageUpdated=[IO.File]::ReadAllText($calendarPagePath)
  if($pageUpdated.Contains("SimuladoCalendarDock")){
    $integrationMode="already"
  } elseif($pageUpdated.Contains("<PrincipalCalendar")){
    $pageUpdated='import { SimuladoCalendarDock } from "@/components/simulado-calendar-dock";'+[Environment]::NewLine+$pageUpdated
    $pageUpdated=$pageUpdated.Replace("<PrincipalCalendar","<SimuladoCalendarDock />"+[Environment]::NewLine+"        <PrincipalCalendar")
    $integrationMode="page"
  } else {
    # Does NOT block the main simulado installation.
    $integrationMode="independent"
  }
} else {
  $integrationMode="independent"
}
Info ("Integracao encontrada: "+$integrationMode+". Calendario de revisoes originais nao sera substituido.")

Info "Instalando resolucao, anotacoes e painel de simulados..."
WriteUtf8 (Join-Path $project "components\estudos-simulados.tsx") $main
WriteUtf8 (Join-Path $project "components\simulado-exam-runner.tsx") $runner
WriteUtf8 (Join-Path $project "components\simulado-calendar-dock.tsx") $dock
WriteUtf8 (Join-Path $project "app\api\estudos\simulados\route.ts") $route

if($integrationMode -eq "template"){
  WriteUtf8 $calendarTemplatePath $template
} elseif($integrationMode -eq "layout"){
  WriteUtf8 $calendarLayoutPath ($template.Replace("MT_SIMULADO_CALENDAR_TEMPLATE_V8","MT_SIMULADO_CALENDAR_LAYOUT_V8"))
} elseif($integrationMode -eq "page"){
  WriteUtf8 $calendarPagePath $pageUpdated
} elseif($integrationMode -eq "independent"){
  Write-Warning "Seu calendario ja tem extensoes proprias. A resolucao foi instalada e pode ser aberta pela aba Estudos - Simulados. Nao alterei seu calendario."
}

Info "V8 instalada. Nenhum patch de texto aplicado em principal-calendar.tsx."
Info "As questoes selecionadas, anotacoes e agendamentos permanecem no Supabase."
$running=$false
try{
  $tcp=New-Object System.Net.Sockets.TcpClient
  $ar=$tcp.BeginConnect("127.0.0.1",3000,$null,$null)
  if($ar.AsyncWaitHandle.WaitOne(1200,$false)){$tcp.EndConnect($ar);$running=$true}
  $tcp.Close()
}catch{}
if(!$running){
  if(!(Get-Command node -ErrorAction SilentlyContinue)){throw "Node.js nao encontrado. Execute npm.cmd run dev na pasta do projeto."}
  Start-Process -FilePath "cmd.exe" -ArgumentList "/k","npm.cmd run dev" -WorkingDirectory $project
  Start-Sleep -Seconds 4
}
Info "Abrindo o Simulado 01..."
Start-Process "http://localhost:3000/estudos/simulados?tab=calendario"
