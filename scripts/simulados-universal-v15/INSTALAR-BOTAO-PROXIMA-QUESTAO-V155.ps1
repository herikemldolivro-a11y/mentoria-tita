$ErrorActionPreference='Stop'
$ProgressPreference='SilentlyContinue'
try{[Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12}catch{}
function Info([string]$s){Write-Host ('[TITA SIMULADOS V15.5] '+$s) -ForegroundColor Cyan}
function ValidProject([string]$p){
 return ($p -and (Test-Path -LiteralPath (Join-Path $p 'package.json')) -and
  (Test-Path -LiteralPath (Join-Path $p 'components\simulado-exam-runner.tsx')))
}
$project=(Get-Location).Path
if(!(ValidProject $project)){
 $known=Join-Path $HOME 'Documents\Codex\2026-08-31\omo-conecto-meu-githuba-aq-x20\mentoria-tita'
 if(ValidProject $known){$project=$known}else{throw 'Abra o PowerShell na pasta mentoria-tita. Nenhum arquivo alterado.'}
}
if(!(Get-Command node -ErrorAction SilentlyContinue)){throw 'Node.js nao encontrado. Nenhum arquivo alterado.'}
Info ('TITA localizada: '+$project)
$assets=Join-Path $env:TEMP ('tita-next-question-v155-'+[guid]::NewGuid().ToString('N'))
[IO.Directory]::CreateDirectory($assets)|Out-Null
$root='https://raw.githubusercontent.com/herikemldolivro-a11y/mentoria-tita/tita-ingles-rotina-v160-20261110/scripts/simulados-universal-v15/'
$names=@('patch-next-question-v155.cjs','install-next-question-v155.cjs')
try{
 foreach($name in $names){
  $wc=New-Object System.Net.WebClient
  $wc.Encoding=[System.Text.Encoding]::UTF8
  $wc.Headers.Add('Cache-Control','no-cache')
  try{$body=$wc.DownloadString($root+$name+'?v=20261110-next-v155r1')}
  finally{$wc.Dispose()}
  if(!$body -or !$body.Contains('MT_SIMULADO_NEXT_QUESTION_') -or $body.Length -lt 500){throw ('Arquivo nao validado: '+$name)}
  [IO.File]::WriteAllText((Join-Path $assets $name),$body,(New-Object System.Text.UTF8Encoding($false)))
  Info ('Recebido: '+$name)
 }
 Push-Location $project
 try{
  & node (Join-Path $assets 'install-next-question-v155.cjs') $project $assets
  if($LASTEXITCODE -ne 0){throw ('Falha na instalacao; codigo '+$LASTEXITCODE)}
 }finally{Pop-Location}
 Write-Host '[TITA SIMULADOS V15.5] Concluido. Atualize o navegador com Ctrl+F5.' -ForegroundColor Green
}finally{
 try{Remove-Item -LiteralPath $assets -Force -Recurse -ErrorAction SilentlyContinue}catch{}
}
