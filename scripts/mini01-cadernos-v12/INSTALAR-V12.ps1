$ErrorActionPreference="Stop"
$ProgressPreference="SilentlyContinue"
try{[Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12}catch{}
function Say([string]$m){Write-Host ("[TITA V12] "+$m) -ForegroundColor Cyan}
function CheckProject([string]$p){
  return ($p -and (Test-Path -LiteralPath (Join-Path $p "package.json")) -and (Test-Path -LiteralPath (Join-Path $p "lib\principal-calendar-system.ts")))
}
function FindProject{
  $look=@(
    (Get-Location).Path,
    (Join-Path $env:USERPROFILE "Documents\Codex\2026-08-31\omo-conecto-meu-githuba-aq-x20\mentoria-tita"),
    (Join-Path $env:USERPROFILE "Documents\mentoria-tita"),
    (Join-Path $env:USERPROFILE "Desktop\mentoria-tita"),
    (Join-Path $env:USERPROFILE "Downloads\mentoria-tita")
  )
  foreach($p in $look){if(CheckProject $p){return $p}}
  foreach($root in @((Join-Path $env:USERPROFILE "Documents"),(Join-Path $env:USERPROFILE "Desktop"))){
    if(!(Test-Path -LiteralPath $root)){continue}
    foreach($folder in (Get-ChildItem -LiteralPath $root -Directory -Recurse -Filter "mentoria-tita" -ErrorAction SilentlyContinue)){
      if(CheckProject $folder.FullName){return $folder.FullName}
    }
  }
  return $null
}
function Fetch([string]$filename){
  $url="https://raw.githubusercontent.com/herikemldolivro-a11y/mentoria-tita/tita-mini01-caderno-v12-simplificado-20261106/scripts/mini01-cadernos-v12/"+$filename+"?v=20261106-v12-fix3"
  $wc=New-Object System.Net.WebClient
  $wc.Encoding=[System.Text.Encoding]::UTF8
  $wc.Headers.Add("Cache-Control","no-cache")
  try{$result=$wc.DownloadString($url)}finally{$wc.Dispose()}
  if([string]::IsNullOrWhiteSpace($result)){throw "Download vazio: "+$filename}
  return $result
}
function ReadLocal([string]$filepath){
  if(!(Test-Path -LiteralPath $filepath)){throw "Nao encontrei "+$filepath}
  return [IO.File]::ReadAllText($filepath)
}
function SaveSafe([string]$rel,[string]$txt){
  $dest=Join-Path $script:project $rel
  $folder=[IO.Path]::GetDirectoryName($dest)
  [IO.Directory]::CreateDirectory($folder)|Out-Null
  $old=if(Test-Path -LiteralPath $dest){[IO.File]::ReadAllText($dest)}else{$null}
  if($null -ne $old -and $old -ceq $txt){Say ("Ja atualizado: "+$rel);return}
  if($null -ne $old){
    $bk=Join-Path $script:backup $rel
    [IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($bk))|Out-Null
    [IO.File]::WriteAllText($bk,$old,(New-Object System.Text.UTF8Encoding($false)))
  }
  [IO.File]::WriteAllText($dest,$txt,(New-Object System.Text.UTF8Encoding($false)))
  $script:changes.Add($rel)|Out-Null
  Say ("Instalado: "+$rel)
}

Say "Iniciando V12: Minissimulado 01 + Cadernos D-1"
$project=FindProject
if(!$project){throw "Nao localizei a pasta mentoria-tita. Execute novamente dentro da pasta do projeto."}
if(!(Get-Command node -ErrorAction SilentlyContinue)){throw "Node.js nao encontrado. Use o terminal onde voce inicia a TITÃ."}
Say ("Projeto localizado: "+$project)

$calendarPath=Join-Path $project "lib\principal-calendar-system.ts"
$runnerPath=Join-Path $project "components\simulado-exam-runner.tsx"
if(!(Test-Path -LiteralPath $runnerPath)){throw "O leitor dos simulados nao existe nesta pasta. Nao alterei nada."}

Say "Baixando 3 fontes pequenas da versao verificada..."
$runnerFallback=Fetch "runner-v12.tsx"
$notebookEditor=Fetch "notebook-empty-auto-editor.tsx"
$notebookTemplate=Fetch "caderno-template.tsx"
if(!$runnerFallback.Contains("TITA_MINI01_D1_V12_FALLBACK") -or !$runnerFallback.Contains('"dia-02-mini"') -or !$runnerFallback.Contains("mt_simulado_question_texts")){
  throw "O leitor baixado nao passou na verificacao. Nenhum arquivo alterado."
}
if(!$notebookEditor.Contains("NotebookEmptyAutoEditor") -or !$notebookEditor.Contains("NotebookManagerModal")){
  throw "O editor de flashcards nao passou na verificacao. Nenhum arquivo alterado."
}
if(!$notebookTemplate.Contains("NotebookEmptyAutoEditor")){
  throw "O template do caderno esta incompleto. Nenhum arquivo alterado."
}

$calendarOriginal=ReadLocal $calendarPath
$calendarNew=$calendarOriginal
if(!$calendarOriginal.Contains("get_principal_calendar_hub_v2")){
  if(!$calendarOriginal.Contains("get_principal_calendar_hub")){
    throw "Nao identifiquei a chamada do calendario: lib/principal-calendar-system.ts. Nada foi alterado."
  }
  $calendarNew=[regex]::Replace($calendarOriginal,'get_principal_calendar_hub(?!_v2)','get_principal_calendar_hub_v2')
}
if(!$calendarNew.Contains("get_principal_calendar_hub_v2")){
  throw "Falha na conexao D-1 dos cadernos. Nenhum arquivo alterado."
}
Say "Calendario D-1 validado."

$runnerOriginal=ReadLocal $runnerPath
$runnerNew=$runnerOriginal
if(!$runnerNew.Contains('"dia-02-mini"')){
  $oldArray='["dia-01-geral","dia-02-geral"]'
  if($runnerNew.Contains($oldArray)){
    $runnerNew=$runnerNew.Replace($oldArray,'["dia-01-geral","dia-02-geral","dia-02-mini"]')
  }elseif($runnerNew.Contains('if (simulado.id !== "dia-01-geral") return;')){
    $runnerNew=$runnerNew.Replace('if (simulado.id !== "dia-01-geral") return;','if (!["dia-01-geral","dia-02-geral","dia-02-mini"].includes(simulado.id)) return;')
  }else{
    Say "Leitor personalizado sem ponto de insercao: usando leitor V12 testado; original sera salvo em backup."
    $runnerNew=$runnerFallback
  }
}
if(!$runnerNew.Contains('"dia-02-mini"') -or !$runnerNew.Contains("mt_simulado_question_texts")){
  Say "Leitor instalado ainda nao suporta os enunciados: usando V12 testado e salvando o original."
  $runnerNew=$runnerFallback
}

$editorDest="components\notebook-empty-auto-editor.tsx"
$templateDest="app\caderno\[notebookId]\template.tsx"
$layoutDest="app\caderno\[notebookId]\layout.tsx"
if(Test-Path -LiteralPath (Join-Path $project $templateDest)){
  $oldTemplate=ReadLocal (Join-Path $project $templateDest)
  if(!$oldTemplate.Contains("NotebookEmptyAutoEditor")){
    if(!(Test-Path -LiteralPath (Join-Path $project $layoutDest))){
      $templateDest=$layoutDest
      Say "Template de caderno personalizado encontrado: instalando pelo layout independente."
    }else{
      throw "Template e layout personalizados em app/caderno/[notebookId]. Para proteger seus arquivos, nao sobrescrevi. Nenhum arquivo alterado."
    }
  }
}

# Validate TSX before touching any project file when TypeScript is available.
$temp=Join-Path $env:TEMP ("tita-v12-preflight-"+[guid]::NewGuid().ToString("N"))
[IO.Directory]::CreateDirectory($temp)|Out-Null
$test=Join-Path $temp "preflight.cjs"
$checkScript=@'
const fs=require("fs");
const path=require("path");
const root=process.cwd();
const tsPath=path.join(root,"node_modules","typescript");
if(!fs.existsSync(tsPath)){
 console.log("[TITA V12] TypeScript local indisponivel; validacao de marcadores executada.");
 process.exit(0);
}
const ts=require(tsPath);
let errors=0;
for(const filename of process.argv.slice(2)){
 const text=fs.readFileSync(filename,"utf8");
 const parsed=ts.createSourceFile(filename,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 for(const e of parsed.parseDiagnostics){
  const pos=parsed.getLineAndCharacterOfPosition(e.start||0);
  console.error("[TITA V12] SINTAXE "+path.basename(filename)+":"+(pos.line+1)+": "+ts.flattenDiagnosticMessageText(e.messageText,"\n"));
  errors++;
 }
}
if(errors)process.exit(1);
console.log("[TITA V12] Sintaxe aprovada nos quatro arquivos.");
'@
[IO.File]::WriteAllText($test,$checkScript,(New-Object System.Text.UTF8Encoding($false)))
try{
  $texts=@($runnerNew,$calendarNew,$notebookEditor,$notebookTemplate)
  $testPaths=@()
  for($i=0;$i -lt $texts.Count;$i++){
    $p=Join-Path $temp ("check-"+$i+".tsx")
    [IO.File]::WriteAllText($p,$texts[$i],(New-Object System.Text.UTF8Encoding($false)))
    $testPaths+=,$p
  }
  Push-Location $project
  try{
    & node $test @testPaths
    if($LASTEXITCODE -ne 0){throw "Erro de sintaxe. Nenhum arquivo da TITÃ foi alterado."}
  }finally{Pop-Location}
}finally{
  try{Remove-Item -LiteralPath $temp -Recurse -Force -ErrorAction SilentlyContinue}catch{}
}

$backup=Join-Path $project (".tita-backups\mini01-caderno-v12-"+(Get-Date -Format "yyyyMMdd-HHmmss"))
$changes=New-Object "System.Collections.Generic.List[string]"
try{
  SaveSafe "lib\principal-calendar-system.ts" $calendarNew
  SaveSafe "components\simulado-exam-runner.tsx" $runnerNew
  SaveSafe $editorDest $notebookEditor
  SaveSafe $templateDest $notebookTemplate
}catch{
  Say ("ERRO REAL: "+$_.Exception.Message)
  Say ("Backup salvo em: "+$backup)
  throw
}
Say ("Instalacao V12 concluida: "+$changes.Count+" arquivos atualizados.")
Say "Cadernos D-1 presentes nos dias da revisao, inclusive vazios. Mini 01 carrega Q022, Q023, Q024, Q028."
$running=$false
try{
  $tcp=New-Object System.Net.Sockets.TcpClient
  $ar=$tcp.BeginConnect("127.0.0.1",3000,$null,$null)
  if($ar.AsyncWaitHandle.WaitOne(1200,$false)){$tcp.EndConnect($ar);$running=$true}
  $tcp.Close()
}catch{}
if(!$running){
  Start-Process -FilePath "cmd.exe" -ArgumentList "/k","npm.cmd run dev" -WorkingDirectory $project
  Start-Sleep -Seconds 3
}
Start-Process "http://localhost:3000/calendario"
Start-Process "http://localhost:3000/estudos/simulados?tab=calendario&data=2026-11-08&simulado=dia-02-mini"
