$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"
try { [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 } catch {}

function Info([string]$s) { Write-Host ("[TITA V13] "+$s) -ForegroundColor Cyan }
function Good([string]$s) { Write-Host ("[TITA V13] "+$s) -ForegroundColor Green }
function IsTita([string]$p) {
  return ($p -and (Test-Path -LiteralPath (Join-Path $p "package.json")) -and
      (Test-Path -LiteralPath (Join-Path $p "app\calendario\page.tsx")) -and
      (Test-Path -LiteralPath (Join-Path $p "components\principal-calendar.tsx")))
}
function FindBestProject {
  $options = New-Object 'System.Collections.Generic.List[string]'
  $fixed = @(
    (Get-Location).Path,
    (Join-Path $env:USERPROFILE "Documents\Codex\2026-08-31\omo-conecto-meu-githuba-aq-x20\mentoria-tita"),
    (Join-Path $env:USERPROFILE "Documents\mentoria-tita"),
    (Join-Path $env:USERPROFILE "Desktop\mentoria-tita"),
    (Join-Path $env:USERPROFILE "Downloads\mentoria-tita")
  )
  foreach($f in $fixed) { if(IsTita $f) { $options.Add($f) } }
  foreach($base in @((Join-Path $env:USERPROFILE "Documents"),(Join-Path $env:USERPROFILE "Desktop"),(Join-Path $env:USERPROFILE "Downloads"))) {
    if(!(Test-Path -LiteralPath $base)) { continue }
    foreach($d in (Get-ChildItem -LiteralPath $base -Directory -Recurse -Filter "mentoria-tita" -ErrorAction SilentlyContinue)) {
      if(IsTita $d.FullName) { $options.Add($d.FullName) }
    }
  }
  $candidates = @($options | Select-Object -Unique)
  $ranked = @(
    foreach($c in $candidates) {
      $manifest=Join-Path $c "private\simulados-pmal\manifest.json"
      if(!(Test-Path -LiteralPath $manifest)){continue}
      $score=1000
      if(Test-Path -LiteralPath (Join-Path $c "components\simulado-exam-runner.tsx")){$score+=120}
      if(Test-Path -LiteralPath (Join-Path $c "components\estudos-simulados.tsx")){$score+=100}
      if(Test-Path -LiteralPath (Join-Path $c "app\estudos\simulados\page.tsx")){$score+=60}
      if(Test-Path -LiteralPath (Join-Path $c "app\caderno\[notebookId]\template.tsx")){$score+=30}
      $updated=(Get-Item -LiteralPath $manifest).LastWriteTime
      [PSCustomObject]@{Folder=$c;Score=$score;Updated=$updated}
    }
  )
  $best=@($ranked | Sort-Object -Property @{Expression="Score";Descending=$true},@{Expression="Updated";Descending=$true})
  if($best.Count -eq 0) { return $null }
  if($best.Count -gt 1) { Info ("Foram encontradas "+$best.Count+" copias da TITÃ. Usando a que tem os simulados instalados.") }
  return $best[0].Folder
}
function IsListening([int]$port) {
  $tcp=New-Object System.Net.Sockets.TcpClient
  try {
    $async=$tcp.BeginConnect("127.0.0.1",$port,$null,$null)
    if(!$async.AsyncWaitHandle.WaitOne(600,$false)){return $false}
    $tcp.EndConnect($async)
    return $true
  } catch {return $false}
  finally {$tcp.Dispose()}
}
function Status([string]$url) {
  try {
    $res=Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 5 -MaximumRedirection 0
    return [int]$res.StatusCode
  } catch {
    try {if($_.Exception.Response){return [int]$_.Exception.Response.StatusCode}}catch{}
    return 0
  }
}
function IsValidRoute([int]$status) {
  return ($status -ge 200 -and $status -lt 400)
}
function Probe([int]$port) {
  $base="http://127.0.0.1:"+$port
  $a=Status ($base+"/calendario")
  $b=Status ($base+"/estudos/simulados")
  $c=Status ($base+"/api/estudos/simulados")
  return [PSCustomObject]@{Base=$base;Calendar=$a;Simulado=$b;Api=$c;Ok=((IsValidRoute $a) -and (IsValidRoute $b) -and $c -ge 200 -and $c -lt 500)}
}
function StartTita([int]$port){
  Info ("Iniciando o projeto correto na porta "+$port+"...")
  $command="npm.cmd run dev -- --port "+$port
  Start-Process -FilePath "cmd.exe" -ArgumentList "/k",$command -WorkingDirectory $project
}
function GetPortProcess([int]$port){
  try {
    $list=@(Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction Stop)
    if($list.Count -eq 0){return $null}
    return (Get-CimInstance Win32_Process -Filter ("ProcessId = "+$list[0].OwningProcess) -ErrorAction Stop)
  } catch {return $null}
}

Info "CORRECAO 404: validacao das rotas e servidor da TITÃ"
$project=FindBestProject
if(!$project) {
  throw "Nao encontrei a pasta da TITÃ com os PDFs e o catalogo dos simulados. Nenhum arquivo foi modificado."
}
if(!(Get-Command node -ErrorAction SilentlyContinue)){
  throw "Node.js nao encontrado. Abra o PowerShell usado para executar sua TITÃ."
}
Info ("Pasta selecionada: "+$project)
$uri="https://raw.githubusercontent.com/herikemldolivro-a11y/mentoria-tita/tita-fix404-simulados-v13-20261106/scripts/repair404-v13/repair-routes.cjs?v=20261106-v13r1"
$client=New-Object System.Net.WebClient
$client.Encoding=[System.Text.Encoding]::UTF8
$client.Headers.Add("Cache-Control","no-cache")
try {$code=$client.DownloadString($uri)} finally {$client.Dispose()}
if(!$code.Contains("VERIFICACAO FINAL OK") -or !$code.Contains("app/estudos/simulados/page.tsx") -or !$code.Contains("backupAndWrite")){
  throw "O instalador remoto esta incompleto. Nenhum arquivo modificado."
}
$temp=Join-Path $env:TEMP ("tita-route-v13-"+[guid]::NewGuid().ToString("N")+".cjs")
[IO.File]::WriteAllText($temp,$code,(New-Object System.Text.UTF8Encoding($false)))
try {
  Push-Location $project
  try {
    & node --check $temp
    if($LASTEXITCODE -ne 0) {throw "Erro de sintaxe no reparador. Nenhum arquivo alterado."}
    & node $temp
    if($LASTEXITCODE -ne 0) {throw "O reparador encontrou um erro especifico, exibido acima. Verifique essa linha."}
  } finally {Pop-Location}
} finally {
  try {Remove-Item -LiteralPath $temp -Force -ErrorAction SilentlyContinue} catch {}
}

Info "Verificando qual servidor realmente responde pelas paginas..."
$port=3000
if(IsListening 3000) {
  $check=Probe 3000
  Info ("Porta 3000: calendario HTTP "+$check.Calendar+"; simulados HTTP "+$check.Simulado+"; API HTTP "+$check.Api)
  if(!$check.Ok){
    # Changes to app routes can need a few seconds to be noticed by next dev.
    for($i=0;$i -lt 9;$i++){
      Start-Sleep -Seconds 2
      $check=Probe 3000
      if($check.Ok){break}
    }
  }
  if(!$check.Ok){
    $proc=GetPortProcess 3000
    $belongs=$false
    if($proc -and $proc.Name -match "node|cmd"){
      $cmdline=[string]$proc.CommandLine
      if($cmdline -and $cmdline.ToLowerInvariant().Contains($project.ToLowerInvariant())){
        $belongs=$true
      }
    }
    if($belongs){
      Info ("Detectado servidor antigo desta propria pasta (PID "+$proc.ProcessId+"). Reiniciando...")
      Stop-Process -Id $proc.ProcessId -Force -ErrorAction Stop
      Start-Sleep -Seconds 2
      StartTita 3000
      $port=3000
    } else {
      Info "A porta 3000 responde por outra instalacao ou nao atualizou. Abrindo a TITÃ correta numa porta livre."
      $port=0
      foreach($p in 3001..3010){if(!(IsListening $p)){$port=$p;break}}
      if(!$port){throw "Nao encontrei porta livre para iniciar a TITÃ. Nenhuma revisao foi alterada."}
      StartTita $port
    }
  }
} else {
  StartTita 3000
}
$ready=$false
for($i=0;$i -lt 30;$i++) {
  Start-Sleep -Seconds 2
  $check=Probe $port
  if($check.Ok){$ready=$true;break}
  if($check.Calendar -eq 500 -or $check.Simulado -eq 500){break}
}
if(!$ready) {
  Info ("DIAGNOSTICO: porta "+$port+"; calendario HTTP "+$check.Calendar+"; simulados HTTP "+$check.Simulado+"; API HTTP "+$check.Api)
  throw "A plataforma nao respondeu corretamente depois do reparo. Confira o terminal do Next.js que foi aberto; a mensagem dele identifica o erro de compilacao."
}
Good ("Rotas CONFIRMADAS na porta "+$port+". Nada de abrir pagina 404.")
Start-Process ($check.Base+"/calendario")
Start-Process ($check.Base+"/estudos/simulados?tab=calendario&data=2026-11-08&simulado=dia-02-mini")
