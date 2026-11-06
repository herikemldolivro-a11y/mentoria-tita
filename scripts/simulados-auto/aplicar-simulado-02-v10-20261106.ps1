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
  $url = "https://raw.githubusercontent.com/herikemldolivro-a11y/mentoria-tita/tita-simulados-instala-auto-7-dias/scripts/simulados-auto/" + $file + "?v=20261106-10-30"
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



Info "ATUALIZACAO V10 - SIMULADO 02 - 30 QUESTOES ORGANIZADAS"
$project=FindProject
if(!$project){throw "Pasta mentoria-tita nao localizada. Abra o PowerShell dentro dela e execute o mesmo comando."}
Info ("Projeto encontrado: "+$project)
$target=Join-Path $project "components\simulado-exam-runner.tsx"
if(!(Test-Path -LiteralPath $target)){throw "Modulo de resolucao ausente nesta pasta. Nenhum arquivo foi alterado."}
$manifest=Join-Path $project "private\simulados-pmal\manifest.json"
$pdf=Join-Path $project "private\simulados-pmal\pdfs\dia-02-geral-prova.pdf"
if(!(Test-Path -LiteralPath $manifest) -or !(Test-Path -LiteralPath $pdf)){
  throw "Simulado 02 e PDF original nao foram encontrados na TITÃ local. Nada foi alterado."
}
$backup=Join-Path $project (".tita-backups\simulado-02-enunciados-v10-"+(Get-Date -Format "yyyyMMdd-HHmmss"))
Info "Baixando apenas o componente de resolucao atualizado..."
$runner=GetText "simulado-exam-runner.tsx"
if(!$runner.Contains("MT_SIMULADOS_01_02_COMPLETE_TEXTS_V10") -or
   !$runner.Contains('["dia-01-geral","dia-02-geral"].includes(simulado.id)') -or
   !$runner.Contains('.eq("simulado_id", simulado.id)') -or
   !$runner.Contains("mt_simulado_question_texts") -or
   !$runner.Contains("mt_simulado_question_notes")){
  throw "Arquivo V10 incorreto ou incompleto. Nao fiz nenhuma alteracao."
}
if(!(Get-Command node -ErrorAction SilentlyContinue)){
 throw "Node.js nao encontrado. Use o PowerShell de onde voce inicia a TITÃ."
}

# Syntax-check JSX/TSX BEFORE touching the project.
$tempDir=Join-Path $env:TEMP ("tita-sim02-v10-"+[guid]::NewGuid().ToString("N"))
[IO.Directory]::CreateDirectory($tempDir)|Out-Null
$tempSource=Join-Path $tempDir "simulado-exam-runner.tsx"
$tempCheck=Join-Path $tempDir "check.cjs"
[IO.File]::WriteAllText($tempSource,$runner,(New-Object System.Text.UTF8Encoding($false)))
$testCode=@'
const fs=require("fs");
const path=require("path");
const project=process.cwd();
const filename=process.argv[2];
const tsDir=path.join(project,"node_modules","typescript");
if(!fs.existsSync(tsDir)){console.log("[TITA] TypeScript local nao encontrado; validacao estatica ignorada.");process.exit(0)}
const ts=require(tsDir);
const text=fs.readFileSync(filename,"utf8");
const f=ts.createSourceFile("simulado-exam-runner.tsx",text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
if(f.parseDiagnostics.length){
 for(const diag of f.parseDiagnostics) console.error(ts.flattenDiagnosticMessageText(diag.messageText,"\n"));
 process.exit(1);
}
console.log("[TITA] TSX V10: sintaxe valida.");
'@
[IO.File]::WriteAllText($tempCheck,$testCode,(New-Object System.Text.UTF8Encoding($false)))
try {
 Push-Location $project
 try {
   & node $tempCheck $tempSource
   if($LASTEXITCODE -ne 0){throw "Erro de sintaxe detectado no componente; atualizacao cancelada."}
 } finally {Pop-Location}
 Info "Salvando backup e atualizando APENAS a tela de resolucao..."
 WriteUtf8 $target $runner
 $installed=[IO.File]::ReadAllText($target)
 if(!$installed.Contains("MT_SIMULADOS_01_02_COMPLETE_TEXTS_V10")){
  throw "Falha na validacao apos a instalacao."
 }
} finally {
 try {Remove-Item -LiteralPath $tempDir -Recurse -Force -ErrorAction SilentlyContinue} catch {}
}

Info "Simulado 02 pronto: 30 enunciados + textos-base, a partir da Q003."
Info "Simulado 01, questoes salvas, gabaritos, respostas, anotacoes e calendario preservados."
$running=$false
try {
 $tcp=New-Object System.Net.Sockets.TcpClient
 $ar=$tcp.BeginConnect("127.0.0.1",3000,$null,$null)
 if($ar.AsyncWaitHandle.WaitOne(1200,$false)){$tcp.EndConnect($ar);$running=$true}
 $tcp.Close()
}catch{}
if(!$running){
 Info "Iniciando a TITÃ..."
 Start-Process -FilePath "cmd.exe" -ArgumentList "/k","npm.cmd run dev" -WorkingDirectory $project
 Start-Sleep -Seconds 4
} else {Info "TITÃ ja aberta: carregando a nova versao."}
Info "Abrindo a primeira questao selecionada no Simulado 02..."
Start-Process "http://localhost:3000/estudos/simulados?tab=calendario&data=2026-11-08&simulado=dia-02-geral"
