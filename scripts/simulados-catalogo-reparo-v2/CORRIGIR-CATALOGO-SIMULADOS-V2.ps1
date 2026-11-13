# MT_SIMULADOS_CATALOGO_RECOVERY_POWERSHELL_V2
$ErrorActionPreference='Stop'
$ProgressPreference='SilentlyContinue'
try{[Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12}catch{}
function IsTita([string]$dir){
 if(-not $dir){return $false}
 return ((Test-Path -LiteralPath (Join-Path $dir 'package.json')) -and
  (Test-Path -LiteralPath (Join-Path $dir 'private\simulados-pmal\manifest.json')) -and
  (Test-Path -LiteralPath (Join-Path $dir 'components\estudos-simulados.tsx')))
}
$project=(Get-Location).Path
if(-not (IsTita $project)){
 $known=Join-Path $HOME 'Documents\Codex\2026-08-31\omo-conecto-meu-githuba-aq-x20\mentoria-tita'
 if(IsTita $known){$project=$known}
 else{throw 'Pasta mentoria-tita não localizada. Execute dentro do projeto.'}
}
if(-not (Get-Command node -ErrorAction SilentlyContinue)){throw 'Node.js não encontrado.'}
if(-not (Test-Path -LiteralPath (Join-Path $project 'node_modules\typescript'))){
 throw 'TypeScript não instalado no projeto. Execute npm.cmd install na pasta TITÃ e tente novamente.'
}
$base='https://raw.githubusercontent.com/herikemldolivro-a11y/mentoria-tita/tita-ingles-rotina-v160-20261110/'
$version='?v=20261113-catalogov2-r1'
$tmp=Join-Path $env:TEMP ('tita-catalogo-v2-'+[guid]::NewGuid().ToString('N'))
[IO.Directory]::CreateDirectory($tmp)|Out-Null
try {
 $wc=New-Object System.Net.WebClient
 $wc.Headers.Add('Cache-Control','no-cache')
 try{
  $wc.DownloadFile($base+'scripts/simulados-catalogo-reparo-v2/instalar-catalogo-v2.cjs'+$version, (Join-Path $tmp 'instalar-catalogo-v2.cjs'))
  $wc.DownloadFile($base+'scripts/simulados-catalogo-reparo-v2/catalogo-v2-route.ts'+$version, (Join-Path $tmp 'catalogo-v2-route.ts'))
 } finally {$wc.Dispose()}
 $installer=Get-Content -LiteralPath (Join-Path $tmp 'instalar-catalogo-v2.cjs') -Raw -Encoding UTF8
 $route=Get-Content -LiteralPath (Join-Path $tmp 'catalogo-v2-route.ts') -Raw -Encoding UTF8
 if(-not $installer.Contains('MT_SIMULADOS_CATALOGO_RECOVERY_INSTALL_V2') -or
    -not $route.Contains('MT_SIMULADOS_CATALOGO_RECOVERY_V2')){
   throw 'Os arquivos baixados não passaram na verificação de integridade.'
 }
 Write-Host ('[TITÃ] Corrigindo carregamento do catálogo em '+$project) -ForegroundColor Cyan
 Push-Location $project
 try{
  & node (Join-Path $tmp 'instalar-catalogo-v2.cjs') $project $tmp
  if($LASTEXITCODE -ne 0){throw ('A correção falhou; veja o erro acima. Código '+$LASTEXITCODE)}
 } finally {Pop-Location}
 Write-Host '[TITÃ] Pronto! Atualize com Ctrl+F5.' -ForegroundColor Green
 Write-Host '[TITÃ] Caso o Next.js não reconheça a rota, pare com Ctrl+C e use npm.cmd run dev.' -ForegroundColor Yellow
}finally{
 Remove-Item -LiteralPath $tmp -Recurse -Force -ErrorAction SilentlyContinue
}
