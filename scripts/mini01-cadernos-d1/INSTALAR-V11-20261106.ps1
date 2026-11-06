$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"
try { [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 } catch {}
function Show([string]$message) { Write-Host ("[TITA V11] " + $message) -ForegroundColor Cyan }
function IsProject([string]$p) {
  return ($p -and (Test-Path -LiteralPath (Join-Path $p "package.json")) -and (Test-Path -LiteralPath (Join-Path $p "lib\principal-calendar-system.ts")) -and (Test-Path -LiteralPath (Join-Path $p "components\principal-calendar.tsx")))
}
function FindProject {
  $options=@(
    (Get-Location).Path,
    (Join-Path $env:USERPROFILE "Documents\Codex\2026-08-31\omo-conecto-meu-githuba-aq-x20\mentoria-tita"),
    (Join-Path $env:USERPROFILE "Documents\mentoria-tita"),
    (Join-Path $env:USERPROFILE "Desktop\mentoria-tita"),
    (Join-Path $env:USERPROFILE "Downloads\mentoria-tita")
  )
  foreach($f in $options){if(IsProject $f){return $f}}
  foreach($top in @((Join-Path $env:USERPROFILE "Documents"),(Join-Path $env:USERPROFILE "Desktop"))){
    if(!(Test-Path -LiteralPath $top)){continue}
    foreach($folder in (Get-ChildItem -LiteralPath $top -Directory -Recurse -Filter "mentoria-tita" -ErrorAction SilentlyContinue)){
      if(IsProject $folder.FullName){return $folder.FullName}
    }
  }
  return $null
}
Show "Iniciando atualizacao Minissimulado 01 + Cadernos D-1"
$project=FindProject
if(!$project){throw "Pasta mentoria-tita nao encontrada. Abra PowerShell na pasta do projeto e cole este mesmo comando."}
if(!(Get-Command node -ErrorAction SilentlyContinue)){throw "Node.js nao encontrado. Use o terminal habitual da TITÃ."}
Show ("Projeto encontrado: "+$project)
$url="https://raw.githubusercontent.com/herikemldolivro-a11y/mentoria-tita/tita-mini01-caderno-d1-v11-20261106/scripts/mini01-cadernos-d1/patch-v11.cjs?v=20261106-v11-d1-mini-04"
$wc=New-Object System.Net.WebClient
$wc.Encoding=[System.Text.Encoding]::UTF8
$wc.Headers.Add("Cache-Control","no-cache")
try { $content=$wc.DownloadString($url) } finally { $wc.Dispose() }
if(!$content.Contains('get_principal_calendar_hub_v2') -or !$content.Contains('MT_MINISSIMULADO_01_V11') -or !$content.Contains('MT_CADERNO_VAZIO_EDITOR_V11')){
  throw "O instalador remoto nao passou pela verificacao de integridade. Nenhum arquivo alterado."
}
$temp=Join-Path $env:TEMP ("tita-mini-caderno-"+[guid]::NewGuid().ToString("N")+".cjs")
[IO.File]::WriteAllText($temp,$content,(New-Object System.Text.UTF8Encoding($false)))
try{
  Push-Location $project
  try{
    & node --check $temp
    if($LASTEXITCODE -ne 0){throw "Erro de sintaxe no instalador, nenhuma alteracao."}
    & node $temp
    if($LASTEXITCODE -ne 0){throw "A instalacao nao concluiu; confira a mensagem acima. O calendario foi preservado."}
  }finally{Pop-Location}
}finally{
  try{Remove-Item -LiteralPath $temp -Force -ErrorAction SilentlyContinue}catch{}
}
Show "Sucesso. Cadernos automáticos um dia antes de cada revisão; minissimulado 01 preparado."
$running=$false
try {
  $tcp=New-Object System.Net.Sockets.TcpClient
  $ar=$tcp.BeginConnect("127.0.0.1",3000,$null,$null)
  if($ar.AsyncWaitHandle.WaitOne(1200,$false)){$tcp.EndConnect($ar);$running=$true}
  $tcp.Close()
}catch{}
if(!$running){
  Show "Abrindo a TITÃ automaticamente..."
  Start-Process -FilePath "cmd.exe" -ArgumentList "/k","npm.cmd run dev" -WorkingDirectory $project
  Start-Sleep -Seconds 4
}
Start-Process "http://localhost:3000/calendario"
Start-Process "http://localhost:3000/estudos/simulados?tab=calendario&data=2026-11-08&simulado=dia-02-mini"
