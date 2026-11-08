$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"
try { [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 } catch {}
function Info([string]$s){Write-Host ("[TITA V14] "+$s) -ForegroundColor Cyan}
function IsInstalled([string]$p){
  return ($p -and (Test-Path -LiteralPath (Join-Path $p "package.json")) -and
    (Test-Path -LiteralPath (Join-Path $p "app\calendario\page.tsx")) -and
    (Test-Path -LiteralPath (Join-Path $p "components\notebook-empty-auto-editor.tsx")))
}
function FindTita {
  $candidates=New-Object "System.Collections.Generic.List[string]"
  $fixed=@(
    (Get-Location).Path,
    (Join-Path $env:USERPROFILE "Documents\Codex\2026-08-31\omo-conecto-meu-githuba-aq-x20\mentoria-tita"),
    (Join-Path $env:USERPROFILE "Documents\mentoria-tita"),
    (Join-Path $env:USERPROFILE "Desktop\mentoria-tita"),
    (Join-Path $env:USERPROFILE "Downloads\mentoria-tita")
  )
  foreach($f in $fixed){if(IsInstalled $f){$candidates.Add($f)}}
  foreach($root in @((Join-Path $env:USERPROFILE "Documents"),(Join-Path $env:USERPROFILE "Desktop"),(Join-Path $env:USERPROFILE "Downloads"))){
    if(!(Test-Path -LiteralPath $root)){continue}
    foreach($d in (Get-ChildItem -LiteralPath $root -Directory -Recurse -Filter "mentoria-tita" -ErrorAction SilentlyContinue)){
      if(IsInstalled $d.FullName){$candidates.Add($d.FullName)}
    }
  }
  $unique=@($candidates | Select-Object -Unique)
  if($unique.Count -eq 0){return $null}
  if(IsInstalled (Get-Location).Path){return (Get-Location).Path}
  $ordered=@(
    foreach($p in $unique){
      $file=Join-Path $p "components\notebook-empty-auto-editor.tsx"
      $template=Join-Path $p "app\caderno\[notebookId]\template.tsx"
      [PSCustomObject]@{Path=$p;Template=(Test-Path -LiteralPath $template);Modified=(Get-Item -LiteralPath $file).LastWriteTime}
    }
  )
  $chosen=@($ordered | Sort-Object -Property @{Expression="Template";Descending=$true},@{Expression="Modified";Descending=$true})
  if($chosen.Count -gt 1){Info ("Encontradas "+$chosen.Count+" copias da TITÃ. Escolhida a mais recente com editor instalado.")}
  return $chosen[0].Path
}

Info "Corrigindo fechamento de cadernos vazios (X e clique fora)"
$project=FindTita
if(!$project){throw "Nao localizei a TITÃ com o editor de cadernos instalado. Nenhum arquivo foi alterado."}
if(!(Get-Command node -ErrorAction SilentlyContinue)){throw "Node.js nao encontrado. Abra o terminal habitual da TITÃ."}
Info ("Pasta: "+$project)
$uri="https://raw.githubusercontent.com/herikemldolivro-a11y/mentoria-tita/tita-fix-caderno-loop-v14-20261107/scripts/notebook-close-v14/patch-close.cjs?v=20261107-v14r1"
$client=New-Object System.Net.WebClient
$client.Encoding=[System.Text.Encoding]::UTF8
$client.Headers.Add("Cache-Control","no-cache")
try{$code=$client.DownloadString($uri)}finally{$client.Dispose()}
if(!$code.Contains("notebook-empty-auto-editor.tsx") -or !$code.Contains("router.replace") -or !$code.Contains("caderno-close-v14")){
  throw "O reparador baixado esta incompleto. Nenhum arquivo foi alterado."
}
$temp=Join-Path $env:TEMP ("tita-fix-close-v14-"+[guid]::NewGuid().ToString("N")+".cjs")
[IO.File]::WriteAllText($temp,$code,(New-Object System.Text.UTF8Encoding($false)))
try{
  Push-Location $project
  try{
    & node --check $temp
    if($LASTEXITCODE -ne 0){throw "Erro de sintaxe no reparador; nenhuma alteracao."}
    & node $temp
    if($LASTEXITCODE -ne 0){throw "A correcao nao foi concluida. Veja a linha [TITA V14] ERRO logo acima."}
  }finally{Pop-Location}
}finally{
  try{Remove-Item -LiteralPath $temp -Force -ErrorAction SilentlyContinue}catch{}
}
Write-Host "[TITA V14] CORRIGIDO: clicar no X ou fora do editor volta ao calendario sem loop." -ForegroundColor Green
Write-Host "[TITA V14] Flashcards, anotacoes, revisoes, nivelamentos e banco de dados preservados." -ForegroundColor Green
Info "Se a pagina estava aberta, atualize com Ctrl+F5 e teste o X."
