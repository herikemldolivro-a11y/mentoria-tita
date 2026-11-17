# MT_SIMULADOS_CATALOGO_ROUTE_REPAIR_PS_V3
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
try { [Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12 } catch {}
function Find-TitaProject {
  $known=Join-Path $HOME 'Documents\Codex\2026-08-31\omo-conecto-meu-githuba-aq-x20\mentoria-tita'
  foreach ($p in @((Get-Location).Path,$known)) {
    if ((Test-Path -LiteralPath (Join-Path $p 'package.json')) -and
        (Test-Path -LiteralPath (Join-Path $p 'components\estudos-simulados.tsx'))) {
      return $p
    }
  }
  throw 'Não encontrei a pasta mentoria-tita. Abra o PowerShell na pasta do projeto.'
}
$project=Find-TitaProject
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  throw 'Node.js não encontrado no PowerShell.'
}
if (-not (Test-Path -LiteralPath (Join-Path $project 'node_modules\typescript'))) {
  throw 'TypeScript não está instalado na TITÃ. Execute npm.cmd install na pasta do projeto.'
}
$base='https://raw.githubusercontent.com/herikemldolivro-a11y/mentoria-tita/tita-ingles-rotina-v160-20261110/'
$version='?v=20261117-reparo-catalogo-v3r1'
$tmp=Join-Path $env:TEMP ('tita-catalogo-rota-v3-'+[guid]::NewGuid().ToString('N'))
[IO.Directory]::CreateDirectory($tmp)|Out-Null
try {
  $fileJs=Join-Path $tmp 'reparar-rota-catalogo-v3.cjs'
  $fileRoute=Join-Path $tmp 'catalogo-v2-route.ts'
  Write-Host '[TITÃ] Reparando erro HTTP 404 do catálogo...' -ForegroundColor Cyan
  Invoke-WebRequest -Uri ($base+'scripts/simulados-catalogo-reparo-v3/reparar-rota-catalogo-v3.cjs'+$version) -UseBasicParsing -Headers @{'Cache-Control'='no-cache'} -OutFile $fileJs
  Invoke-WebRequest -Uri ($base+'scripts/simulados-catalogo-reparo-v2/catalogo-v2-route.ts'+$version) -UseBasicParsing -Headers @{'Cache-Control'='no-cache'} -OutFile $fileRoute
  $jsText=Get-Content -LiteralPath $fileJs -Raw -Encoding UTF8
  $routeText=Get-Content -LiteralPath $fileRoute -Raw -Encoding UTF8
  if (-not $jsText.Contains('MT_SIMULADOS_CATALOGO_ROUTE_REPAIR_V3') -or
      -not $routeText.Contains('MT_SIMULADOS_CATALOGO_RECOVERY_V2')) {
    throw 'Os arquivos baixados não passaram na verificação de integridade.'
  }
  Push-Location $project
  try {
    & node $fileJs $project $tmp
    if ($LASTEXITCODE -ne 0) {
      throw ('O reparo falhou (código '+$LASTEXITCODE+'). Leia a mensagem acima.')
    }
  } finally { Pop-Location }
  Write-Host ''
  Write-Host '[TITÃ] Arquivo da rota reparado e conferido.' -ForegroundColor Green
  Write-Host '[TITÃ] OBRIGATÓRIO: no PowerShell que roda npm.cmd run dev, pressione Ctrl+C.' -ForegroundColor Yellow
  Write-Host '[TITÃ] Depois execute novamente npm.cmd run dev e atualize a TITÃ com Ctrl+F5.' -ForegroundColor Yellow
} finally {
  Remove-Item -LiteralPath $tmp -Recurse -Force -ErrorAction SilentlyContinue
}