# MT_ENGLISH_QUESTION_VOCAB_POWERSHELL_V162
$ErrorActionPreference='Stop'
$ProgressPreference='SilentlyContinue'
try{[Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12}catch{}
function IsTita([string]$dir){
 if(-not $dir){return $false}
 return ((Test-Path -LiteralPath (Join-Path $dir 'package.json')) -and
         (Test-Path -LiteralPath (Join-Path $dir 'components\english-reader.tsx')))
}
$project=(Get-Location).Path
if(-not (IsTita $project)){
 $known=Join-Path $HOME 'Documents\Codex\2026-08-31\omo-conecto-meu-githuba-aq-x20\mentoria-tita'
 if(IsTita $known){$project=$known}
 else{throw 'Não localizei a pasta mentoria-tita. Execute na pasta do projeto.'}
}
if(-not (Get-Command node -ErrorAction SilentlyContinue)){throw 'Node.js não disponível no PowerShell.'}
if(-not (Test-Path -LiteralPath (Join-Path $project 'node_modules\typescript'))){
 throw 'Dependência TypeScript não encontrada. Execute npm.cmd install dentro da pasta TITÃ.'
}
$uri='https://raw.githubusercontent.com/herikemldolivro-a11y/mentoria-tita/tita-ingles-rotina-v160-20261110/scripts/ingles-semana2-v162/instalar-vocab-questoes-v162.cjs?v=20261113-v162r2'
$temp=Join-Path $env:TEMP ('tita-en-vocab-v162-'+[guid]::NewGuid().ToString('N')+'.cjs')
try{
 Write-Host ('[TITÃ] Instalando vocabulário nas provas de Inglês em '+$project) -ForegroundColor Cyan
 Invoke-WebRequest -UseBasicParsing -Uri $uri -OutFile $temp -Headers @{'Cache-Control'='no-cache'}
 $code=Get-Content -LiteralPath $temp -Raw -Encoding UTF8
 if(-not $code.Contains('MT_ENGLISH_QUESTION_VOCAB_INSTALL_V162')){
  throw 'Instalador inválido ou incompleto. Nenhum arquivo foi alterado.'
 }
 Push-Location $project
 try{
  & node $temp $project
  if($LASTEXITCODE -ne 0){throw ('Instalação não concluída (código '+$LASTEXITCODE+'). Veja a mensagem acima.')}
 }finally{Pop-Location}
 Write-Host ''
 Write-Host '[TITÃ] Semana 2 já cadastrada no Supabase: 12 textos e 6 provas.' -ForegroundColor Green
 Write-Host '[TITÃ] Vocabulário nos enunciados instalado. Faça Ctrl+F5 na Semana 2.' -ForegroundColor Green
}finally{
 Remove-Item -LiteralPath $temp -Force -ErrorAction SilentlyContinue
}
