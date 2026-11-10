$ErrorActionPreference='Stop'
$ProgressPreference='SilentlyContinue'
try{[Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12}catch{}
function Log([string]$m){Write-Host ('[TITA APOSTA FINAL] '+$m) -ForegroundColor Cyan}
function IsTita([string]$folder){
 if(!$folder){return $false}
 return ((Test-Path -LiteralPath (Join-Path $folder 'package.json')) -and
         (Test-Path -LiteralPath (Join-Path $folder 'lib\supabase\env.ts')))
}
$project=(Get-Location).Path
if(!(IsTita $project)){
 $known=Join-Path $HOME 'Documents\Codex\2026-08-31\omo-conecto-meu-githuba-aq-x20\mentoria-tita'
 if(IsTita $known){$project=$known}
 else{throw 'Não encontrei a pasta mentoria-tita. Execute dentro da pasta da plataforma.'}
}
if(!(Get-Command node -ErrorAction SilentlyContinue)){throw 'Node.js não encontrado no PowerShell.'}
if(!(Test-Path -LiteralPath (Join-Path $project 'node_modules\typescript'))){throw 'O TypeScript não está instalado. Na pasta TITÃ, execute npm.cmd install e tente novamente.'}
Log ('Pasta do projeto: '+$project)
$base='https://raw.githubusercontent.com/herikemldolivro-a11y/mentoria-tita/tita-ingles-rotina-v160-20261110/'
$work=Join-Path $env:TEMP ('tita-aposta-final-v1-'+[guid]::NewGuid().ToString('N'))
[IO.Directory]::CreateDirectory($work)|Out-Null
$files=@(
 @('scripts/aposta-final-v1/install-aposta-final-v1.cjs','install-aposta-final-v1.cjs'),
 @('scripts/aposta-final-v1/patch-aposta-final-runner.cjs','patch-aposta-final-runner.cjs'),
 @('scripts/aposta-final-v1/patch-aposta-final-shell.cjs','patch-aposta-final-shell.cjs'),
 @('data/aposta-final/semana-01-direito-penal.json','semana-01-direito-penal.json'),
 @('components/aposta-final-experience.tsx','aposta-final-experience.tsx'),
 @('components/aposta-final-calendar-v1.tsx','aposta-final-calendar-v1.tsx'),
 @('app/aposta-final/page.tsx','aposta-final-page.tsx')
)
try{
 $wc=New-Object System.Net.WebClient
 $wc.Headers.Add('Cache-Control','no-cache')
 try{
  foreach($pair in $files){
    $remote=$base+$pair[0]+'?v=20261110-apostafinal-v1r1'
    $dest=Join-Path $work $pair[1]
    Log ('Baixando '+$pair[1]+'...')
    $wc.DownloadFile($remote,$dest)
    if((Get-Item -LiteralPath $dest).Length -lt 90){throw ('Arquivo remoto incompleto: '+$pair[1])}
  }
 }finally{$wc.Dispose()}
 $installer=Get-Content (Join-Path $work 'install-aposta-final-v1.cjs') -Raw -Encoding UTF8
 $catalogue=Get-Content (Join-Path $work 'semana-01-direito-penal.json') -Raw -Encoding UTF8
 if(!$installer.Contains('MT_APOSTA_FINAL_INSTALLER_V1') -or
    !$catalogue.Contains('MT_APOSTA_FINAL_V1')){
   throw 'Falha na validação de integridade do instalador ou do arquivo de questões.'
 }
 Log 'Validando estrutura da semana e instalando sem sobrescrever seus dados de estudo...'
 Push-Location $project
 try{
  & node (Join-Path $work 'install-aposta-final-v1.cjs') $project $work
  if($LASTEXITCODE -ne 0){throw ('Falha de pré-validação/instalação. Código '+$LASTEXITCODE)}
 }finally{Pop-Location}
 Write-Host ''
 Write-Host 'APOSTA FINAL · SEMANA 1 INSTALADA!' -ForegroundColor Green
 Write-Host 'Abra http://localhost:3000/aposta-final' -ForegroundColor Yellow
 Write-Host 'Ou acesse pelo atalho APOSTA FINAL no CFO PMAL.' -ForegroundColor Green
}finally{
 try{Remove-Item -LiteralPath $work -Recurse -Force -ErrorAction SilentlyContinue}catch{}
}
