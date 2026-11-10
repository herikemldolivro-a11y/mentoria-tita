$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
try { [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 } catch {}
function Info([string]$m){ Write-Host ('[TITA V15.4] '+$m) -ForegroundColor Cyan }
function ValidProject([string]$p){
 return ($p -and (Test-Path -LiteralPath (Join-Path $p 'package.json')) -and
  (Test-Path -LiteralPath (Join-Path $p 'components\simulado-exam-runner.tsx')) -and
  (Test-Path -LiteralPath (Join-Path $p 'components\estudos-simulados.tsx')))
}
$project=(Get-Location).Path
if(!(ValidProject $project)){
 $known=Join-Path $HOME 'Documents\Codex\2026-08-31\omo-conecto-meu-githuba-aq-x20\mentoria-tita'
 if(ValidProject $known){$project=$known}else{throw 'TITA V15.3 nao localizada. Execute na pasta mentoria-tita.'}
}
if(!(Get-Command node -ErrorAction SilentlyContinue)){throw 'Node.js nao encontrado. Nenhum arquivo foi alterado.'}
Info ('Projeto: '+$project)
$assets=Join-Path $env:TEMP ('tita-flashcards-v154-'+[guid]::NewGuid().ToString('N'))
[IO.Directory]::CreateDirectory($assets)|Out-Null
$names=@('simulado-flashcards-v154.tsx','simulado-exam-runner.tsx','estudos-simulados.tsx','patch-calendar-flashcards-v154.cjs','install-flashcards-v154.cjs')
$root='https://raw.githubusercontent.com/herikemldolivro-a11y/mentoria-tita/tita-simulados-flashcards-v154-20261109/scripts/simulados-universal-v15/'
try {
 foreach($name in $names){
  $wc=New-Object System.Net.WebClient
  $wc.Encoding=[System.Text.Encoding]::UTF8
  $wc.Headers.Add('Cache-Control','no-cache')
  try{$contents=$wc.DownloadString($root+$name+'?v=20261109-v154r1')}
  finally{$wc.Dispose()}
  if(!$contents -or $contents.Length -lt 100){throw ('Download incompleto: '+$name)}
  if($name -like '*flashcards-v154*' -and !$contents.Contains('MT_SIMULADO_FLASHCARD')){throw ('Assinatura invalida: '+$name)}
  [IO.File]::WriteAllText((Join-Path $assets $name),$contents,(New-Object System.Text.UTF8Encoding($false)))
  Info ('Recebido: '+$name)
 }
 Push-Location $project
 try {
  & node (Join-Path $assets 'install-flashcards-v154.cjs') $project $assets
  if($LASTEXITCODE -ne 0){throw ('Falha na instalacao; codigo '+$LASTEXITCODE)}
 } finally { Pop-Location }
 Write-Host '[TITA V15.4] Verifique o novo Caderno de flashcards na resolucao de simulados.' -ForegroundColor Green
} finally {
 try{Remove-Item -LiteralPath $assets -Force -Recurse -ErrorAction SilentlyContinue}catch{}
}
