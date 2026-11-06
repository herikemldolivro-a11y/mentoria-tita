$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"
try {[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12} catch {}
function Report([string]$m){Write-Host ("[TITA CADERNOS] "+$m) -ForegroundColor Cyan}
function ProjectOk([string]$p){
 return ($p -and (Test-Path -LiteralPath (Join-Path $p "package.json")) -and (Test-Path -LiteralPath (Join-Path $p "components\principal-calendar.tsx")))
}
function FindProject {
 $base=@(
  (Get-Location).Path,
  (Join-Path $env:USERPROFILE "Documents\Codex\2026-08-31\omo-conecto-meu-githuba-aq-x20\mentoria-tita"),
  (Join-Path $env:USERPROFILE "Documents\mentoria-tita"),
  (Join-Path $env:USERPROFILE "Desktop\mentoria-tita"),
  (Join-Path $env:USERPROFILE "Downloads\mentoria-tita")
 )
 foreach($b in $base){if(ProjectOk $b){return $b}}
 foreach($root in @((Join-Path $env:USERPROFILE "Documents"),(Join-Path $env:USERPROFILE "Desktop"))){
  if(!(Test-Path -LiteralPath $root)){continue}
  $dirs=@(Get-ChildItem -LiteralPath $root -Recurse -Directory -Filter "mentoria-tita" -ErrorAction SilentlyContinue)
  foreach($d in $dirs){if(ProjectOk $d.FullName){return $d.FullName}}
 }
 return $null
}
function ReadRemote([string]$name){
 $base="https://raw.githubusercontent.com/herikemldolivro-a11y/mentoria-tita/tita-caderno-manual-calendario-v1-20261106/scripts/manual-notebooks/"
 $url=$base+$name+"?v=20261106-c1"
 $resp=Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 90 -Headers @{"Cache-Control"="no-cache"}
 if($resp.StatusCode -ne 200){throw "Nao foi possivel baixar "+$name}
 return [string]$resp.Content
}
function WriteUTF8([string]$relative,[string]$content){
 $path=Join-Path $script:project $relative
 $parent=Split-Path -Parent $path
 if(!(Test-Path -LiteralPath $parent)){[IO.Directory]::CreateDirectory($parent)|Out-Null}
 if(Test-Path -LiteralPath $path){
   $old=[IO.File]::ReadAllText($path)
   if($old -eq $content){Report ("Ja atualizado: "+$relative);return}
   $backupPath=Join-Path $script:backup $relative
   [IO.Directory]::CreateDirectory((Split-Path -Parent $backupPath))|Out-Null
   Copy-Item -LiteralPath $path -Destination $backupPath -Force
 }
 [IO.File]::WriteAllText($path,$content,(New-Object System.Text.UTF8Encoding($false)))
 Report ("Instalado: "+$relative)
}
Report "INSTALADOR CADERNOS AVULSOS V1 - 06/11/2026"
$project=FindProject
if(!$project){throw "Nao localizei mentoria-tita. Abra PowerShell dentro da pasta do projeto e execute o MESMO comando."}
if(!(Get-Command node -ErrorAction SilentlyContinue)){throw "Node.js nao encontrado. Abra o PowerShell usado para iniciar a TITÃ."}
Report ("Projeto encontrado: "+$project)
$backup=Join-Path $project (".tita-backups\cadernos-avulsos-"+(Get-Date -Format "yyyyMMdd-HHmmss"))
$names=@(
 "mt-manual-notebooks.tsx",
 "novo-page.tsx",
 "notebook-page.tsx",
 "list-page.tsx",
 "patch-calendar.cjs"
)
$source=@{}
foreach($name in $names){
  Report ("Conferindo "+$name)
  $source[$name]=ReadRemote $name
}
if(!$source["mt-manual-notebooks.tsx"].Contains("mt_complete_manual_notebook_review") -or !$source["mt-manual-notebooks.tsx"].Contains("useManualNotebookCounts")){
 throw "A interface dos cadernos nao foi baixada corretamente. Nenhuma alteracao foi aplicada."
}
if(!$source["patch-calendar.cjs"].Contains("CRIAR CADERNO DE ANOTAÇÕES") -or !$source["patch-calendar.cjs"].Contains("Calendário original preservado")){
 throw "A integracao de calendario nao foi validada. Nenhuma alteracao foi aplicada."
}
if(!$source["novo-page.tsx"].Contains("ManualNotebookCreate") -or !$source["notebook-page.tsx"].Contains("ManualNotebookWorkspace")){
 throw "As rotas do caderno estao incompletas."
}
$patchFile=Join-Path $env:TEMP ("tita-caderno-patch-"+[guid]::NewGuid().ToString("N")+".cjs")
[IO.File]::WriteAllText($patchFile,$source["patch-calendar.cjs"],(New-Object System.Text.UTF8Encoding($false)))
try {
  & node --check $patchFile
  if($LASTEXITCODE -ne 0){throw "Falha na verificacao do instalador Node."}
  Report "Arquivos validados. Instalando modulos sem alterar revisoes ou nivelamentos..."
  WriteUTF8 "components\mt-manual-notebooks.tsx" $source["mt-manual-notebooks.tsx"]
  WriteUTF8 "app\caderno\manual\novo\page.tsx" $source["novo-page.tsx"]
  WriteUTF8 "app\caderno\manual\[id]\page.tsx" $source["notebook-page.tsx"]
  WriteUTF8 "app\caderno\manual\page.tsx" $source["list-page.tsx"]
  Push-Location $project
  try {
    Report "Integrando o botao circulado e os cadernos ao calendario principal..."
    & node $patchFile
    if($LASTEXITCODE -ne 0){throw "Falha de integracao. O calendario original nao foi substituido. Envie as ultimas linhas acima."}
  } finally {Pop-Location}

  $caderno=Join-Path $project "app\caderno\page.tsx"
  if(Test-Path -LiteralPath $caderno){
    $current=[IO.File]::ReadAllText($caderno)
    if(!$current.Contains("ManualNotebookDirectory")){
      $new=$current
      $new=$new.Replace('import { NotebookHub } from "@/components/notebook-hub";','import { NotebookHub } from "@/components/notebook-hub";'+[Environment]::NewLine+'import { ManualNotebookDirectory } from "@/components/mt-manual-notebooks";')
      $new=$new.Replace('<NotebookHub/>','<NotebookHub/><ManualNotebookDirectory/>')
      $new=$new.Replace('<NotebookHub />','<NotebookHub /><ManualNotebookDirectory/>')
      if($new.Contains("ManualNotebookDirectory") -and $new.Contains('import { ManualNotebookDirectory }')){
        WriteUTF8 "app\caderno\page.tsx" $new
      } else {Report "A pagina de cadernos tem um layout diferente; lista de avulsos disponivel em /caderno/manual."}
    }
  }

  Report "INSTALACAO CONCLUIDA. Cadernos manuais: +2, +4, +7, +15 dias, fora do limite de 5 nivelamentos."
  $running=$false
  try {
    $tcp=New-Object System.Net.Sockets.TcpClient
    $ar=$tcp.BeginConnect("127.0.0.1",3000,$null,$null)
    if($ar.AsyncWaitHandle.WaitOne(1200,$false)){$tcp.EndConnect($ar);$running=$true}
    $tcp.Close()
  } catch {}
  if(!$running){
    Report "Iniciando TITÃ..."
    Start-Process -FilePath "cmd.exe" -ArgumentList "/k","npm.cmd run dev" -WorkingDirectory $project
    Start-Sleep -Seconds 4
  } else {Report "TITÃ ja iniciada. A pagina sera atualizada."}
  Start-Process "http://localhost:3000/calendario"
} finally {
 try{Remove-Item -LiteralPath $patchFile -Force -ErrorAction SilentlyContinue}catch{}
}
