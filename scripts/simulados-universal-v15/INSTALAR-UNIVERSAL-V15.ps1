$ErrorActionPreference="Stop"
$ProgressPreference="SilentlyContinue"
try{[Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12}catch{}
function Info([string]$s){Write-Host ("[TITA V15] "+$s) -ForegroundColor Cyan}
function IsTita([string]$dir){
  if(!$dir){return $false}
  return (Test-Path -LiteralPath (Join-Path $dir "package.json")) -and
    (Test-Path -LiteralPath (Join-Path $dir "private\simulados-pmal\manifest.json")) -and
    (Test-Path -LiteralPath (Join-Path $dir "components\simulado-exam-runner.tsx")) -and
    (Test-Path -LiteralPath (Join-Path $dir "components\principal-calendar.tsx")) -and
    (Test-Path -LiteralPath (Join-Path $dir "app\estudos\simulados\page.tsx"))
}
function FindProject{
  $candidates=New-Object 'System.Collections.Generic.List[string]'
  $common=@(
    (Get-Location).Path,
    (Join-Path $env:USERPROFILE "Documents\Codex\2026-08-31\omo-conecto-meu-githuba-aq-x20\mentoria-tita"),
    (Join-Path $env:USERPROFILE "Documents\mentoria-tita"),
    (Join-Path $env:USERPROFILE "Desktop\mentoria-tita"),
    (Join-Path $env:USERPROFILE "Downloads\mentoria-tita")
  )
  foreach($d in $common){if(IsTita $d){$candidates.Add($d)}}
  if(IsTita (Get-Location).Path){return (Get-Location).Path}
  foreach($top in @((Join-Path $env:USERPROFILE "Documents"),(Join-Path $env:USERPROFILE "Desktop"),(Join-Path $env:USERPROFILE "Downloads"))){
    if(!(Test-Path -LiteralPath $top)){continue}
    foreach($dir in (Get-ChildItem -LiteralPath $top -Directory -Filter "mentoria-tita" -Recurse -ErrorAction SilentlyContinue)){
      if(IsTita $dir.FullName){$candidates.Add($dir.FullName)}
    }
  }
  $unique=@($candidates|Select-Object -Unique)
  if($unique.Count -lt 1){return $null}
  $processes=@(Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" -ErrorAction SilentlyContinue)
  $ranked=@(foreach($dir in $unique){
    $manifest=(Get-Item -LiteralPath (Join-Path $dir "private\simulados-pmal\manifest.json")).LastWriteTime
    $running=$false
    foreach($proc in $processes){if($proc.CommandLine -and $proc.CommandLine.ToLowerInvariant().Contains($dir.ToLowerInvariant())){$running=$true;break}}
    [PSCustomObject]@{Dir=$dir;IsRunning=$running;LastUpdated=$manifest}
  })
  $ranked=@($ranked|Sort-Object -Property @{Expression="IsRunning";Descending=$true},@{Expression="LastUpdated";Descending=$true})
  if($ranked.Count -gt 1){Info ("Detectadas "+$ranked.Count+" copias. Usando a instalacao ativa/mais recente: "+$ranked[0].Dir)}
  return $ranked[0].Dir
}
Info "Preparando sistema UNIVERSAL de simulados + revisoes no calendario"
$project=FindProject
if(!$project){throw "Pasta TITÃ com simulados nao encontrada. Abra o PowerShell na pasta mentoria-tita e cole novamente. Nenhum arquivo foi alterado."}
if(!(Get-Command node -ErrorAction SilentlyContinue)){throw "Node.js nao encontrado neste terminal. Nenhum arquivo alterado."}
Info ("Pasta localizada: "+$project)
$url="https://raw.githubusercontent.com/herikemldolivro-a11y/mentoria-tita/tita-simulados-revisao-universal-v15-20261109/scripts/simulados-universal-v15/install-v15.cjs?v=20261109-v15r3"
$wc=New-Object System.Net.WebClient
$wc.Encoding=[System.Text.Encoding]::UTF8
$wc.Headers.Add("Cache-Control","no-cache")
try{$code=$wc.DownloadString($url)}finally{$wc.Dispose()}
if(!$code.Contains("MT_SIMULADO_UNIVERSAL_INSTALLER_V15") -or !$code.Contains("patch-calendar-v15.cjs") -or !$code.Contains("validateSyntax") -or !$code.Contains(".tita-backups")){
  throw "Arquivo de instalacao incompleto. Nenhuma alteracao feita."
}
$temp=Join-Path $env:TEMP ("mt-simulados-universal-v15-"+[guid]::NewGuid().ToString("N")+".cjs")
[IO.File]::WriteAllText($temp,$code,(New-Object System.Text.UTF8Encoding($false)))
try{
 Push-Location $project
 try{
   & node --check $temp
   if($LASTEXITCODE -ne 0){throw "Erro de sintaxe no instalador V15. Nenhum arquivo alterado."}
   & node $temp
   if($LASTEXITCODE -ne 0){throw "Instalacao V15 encontrou o erro REAL indicado acima. Nenhuma mudanca parcial foi mantida."}
 }finally{Pop-Location}
}finally{try{Remove-Item -LiteralPath $temp -Force -ErrorAction SilentlyContinue}catch{}}
Write-Host "[TITA V15] Instalacao local concluida. Banco, datas antigas, cadernos e nivelamentos preservados." -ForegroundColor Green
Info "O Next.js deve recarregar automaticamente as alteracoes. No navegador pressione Ctrl + F5."
try{
  $req=Invoke-WebRequest -UseBasicParsing -Uri "http://localhost:3000/estudos/simulados" -TimeoutSec 5
  if($req.StatusCode -lt 400){Start-Process "http://localhost:3000/estudos/simulados"}
}catch{
  Info "Nao abri uma pagina que possa dar 404. Caso a TITÃ esteja fechada, execute npm.cmd run dev na pasta encontrada acima."
}
