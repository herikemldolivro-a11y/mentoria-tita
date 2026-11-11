$ErrorActionPreference='Stop'
$ProgressPreference='SilentlyContinue'
try{[Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12}catch{}
function Info([string]$message){Write-Host ('[TITA NIVELAMENTO 404] '+$message) -ForegroundColor Cyan}
function IsProject([string]$folder){
 return ($folder -and (Test-Path -LiteralPath (Join-Path $folder 'package.json')) -and (Test-Path -LiteralPath (Join-Path $folder 'lib\supabase\env.ts')))
}
$project=(Get-Location).Path
if(!(IsProject $project)){
 $known=Join-Path $HOME 'Documents\Codex\2026-08-31\omo-conecto-meu-githuba-aq-x20\mentoria-tita'
 if(IsProject $known){$project=$known}
 else{throw 'Não encontrei a pasta mentoria-tita. Abra o PowerShell dentro da TITÃ.'}
}
if(!(Get-Command node -ErrorAction SilentlyContinue)){throw 'Node.js não está disponível no PowerShell.'}
if(!(Test-Path -LiteralPath (Join-Path $project 'node_modules\typescript'))){
 throw 'TypeScript não encontrado. Execute npm.cmd install dentro da TITÃ antes.'
}
$base='https://raw.githubusercontent.com/herikemldolivro-a11y/mentoria-tita/tita-ingles-rotina-v160-20261110/'
$version='?v=20261111-nivelamento-404-v1r1'
$work=Join-Path $env:TEMP ('tita-fix-nivelamento-'+[guid]::NewGuid().ToString('N'))
[IO.Directory]::CreateDirectory($work)|Out-Null
$files=@(
 @('scripts/nivelamento-404-v1/install-leveling-404-v1.cjs','install-leveling-404-v1.cjs'),
 @('scripts/nivelamento-404-v1/leveling-bank-page.tsx','leveling-bank-page.tsx'),
 @('scripts/nivelamento-404-v1/lesson-list-page.tsx','lesson-list-page.tsx'),
 @('app/nivelamentos/page.tsx','leveling-home-page.tsx'),
 @('components/leveling-question-bank.tsx','leveling-question-bank.tsx'),
 @('components/leveling-learning-center.tsx','leveling-learning-center.tsx'),
 @('lib/leveling-learning-system.ts','leveling-learning-system.ts'),
 @('lib/principal-leveling-launch.ts','principal-leveling-launch.ts')
)
try{
 Info ('Pasta da TITÃ: '+$project)
 $client=New-Object System.Net.WebClient
 $client.Headers.Add('Cache-Control','no-cache')
 try{
  foreach($item in $files){
   $dest=Join-Path $work $item[1]
   Info ('Obtendo '+$item[1])
   $client.DownloadFile($base+$item[0]+$version,$dest)
   if((Get-Item -LiteralPath $dest).Length -lt 90){throw ('Arquivo remoto incompleto: '+$item[1])}
  }
 }finally{$client.Dispose()}
 $installer=Get-Content -LiteralPath (Join-Path $work 'install-leveling-404-v1.cjs') -Raw -Encoding UTF8
 if(!$installer.Contains('MT_FIX_LEVELING_404_V1')){throw 'Instalador remoto não passou na verificação.'}
 Push-Location $project
 try{
  & node (Join-Path $work 'install-leveling-404-v1.cjs') $project $work
  if($LASTEXITCODE -ne 0){throw ('Falha na correção. Código '+$LASTEXITCODE)}
 }finally{Pop-Location}
 Info 'Reparo instalado. Nenhuma resposta, caderno ou revisão foi apagada.'
 Write-Host ''
 Write-Host 'IMPORTANTE: pare o servidor com Ctrl+C e reinicie com npm.cmd run dev.' -ForegroundColor Yellow
 Write-Host 'Se continuar 404, com o servidor parado, execute: Remove-Item .next -Recurse -Force' -ForegroundColor Yellow
}finally{
 try{Remove-Item -LiteralPath $work -Recurse -Force -ErrorAction SilentlyContinue}catch{}
}
