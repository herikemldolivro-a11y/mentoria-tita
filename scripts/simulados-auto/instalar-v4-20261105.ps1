$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"
try { [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 } catch {}

function Info([string]$t) { Write-Host ("[TITA] " + $t) -ForegroundColor Cyan }
function IsProject([string]$p) {
  return ($p -and (Test-Path -LiteralPath (Join-Path $p "package.json")) -and (Test-Path -LiteralPath (Join-Path $p "components")))
}
function FindProject {
  $possibles = @(
    (Get-Location).Path,
    (Join-Path $env:USERPROFILE "Documents\Codex\2026-08-31\omo-conecto-meu-githuba-aq-x20\mentoria-tita"),
    (Join-Path $env:USERPROFILE "Documents\mentoria-tita"),
    (Join-Path $env:USERPROFILE "Desktop\mentoria-tita"),
    (Join-Path $env:USERPROFILE "Downloads\mentoria-tita")
  )
  foreach($p in $possibles) { if(IsProject $p){ return $p } }
  foreach($base in @((Join-Path $env:USERPROFILE "Documents"),(Join-Path $env:USERPROFILE "Desktop"))) {
    if(!(Test-Path -LiteralPath $base)){continue}
    $dirs = @(Get-ChildItem -LiteralPath $base -Recurse -Directory -Filter "mentoria-tita" -ErrorAction SilentlyContinue)
    foreach($d in $dirs){ if(IsProject $d.FullName){return $d.FullName} }
  }
  return $null
}
function FindZip {
  $bases = @((Join-Path $env:USERPROFILE "Downloads"),(Join-Path $env:USERPROFILE "Desktop"),(Join-Path $env:USERPROFILE "Documents"),$script:project)
  $patterns = @("TITA_TODOS_7_DIAS_INSTALACAO_UNICA.zip","TITA_SIMULADOS_SEMANA_01.zip","SIMULADOS_PMAL_DIAS_01_A_07*.zip")
  foreach($pattern in $patterns) {
    foreach($base in $bases) {
      if(!(Test-Path -LiteralPath $base)){continue}
      $found = @(Get-ChildItem -Path (Join-Path $base $pattern) -File -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending)
      if($found.Count -gt 0) {return $found[0]}
    }
  }
  foreach($pattern in $patterns) {
    foreach($base in $bases) {
      if(!(Test-Path -LiteralPath $base)){continue}
      $found = @(Get-ChildItem -LiteralPath $base -Recurse -File -Filter $pattern -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending)
      if($found.Count -gt 0) {return $found[0]}
    }
  }
  return $null
}
function GetText([string]$file) {
  $url = "https://raw.githubusercontent.com/herikemldolivro-a11y/mentoria-tita/tita-simulados-instala-auto-7-dias/scripts/simulados-auto/" + $file
  $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 90
  if($response.StatusCode -ne 200){throw "Nao consegui acessar o arquivo "+$file}
  return [string]$response.Content
}
function WriteUtf8([string]$path,[string]$content) {
  $directory = Split-Path -Parent $path
  if(!(Test-Path -LiteralPath $directory)){New-Item -ItemType Directory -Force -Path $directory | Out-Null}
  if(Test-Path -LiteralPath $path){
    $old = [IO.File]::ReadAllText($path)
    if($old -eq $content){return}
    $relative = $path.Substring($script:project.Length).TrimStart('\')
    $backup = Join-Path $script:backup $relative
    New-Item -ItemType Directory -Force -Path (Split-Path -Parent $backup) | Out-Null
    Copy-Item -LiteralPath $path -Destination $backup -Force
  }
  [IO.File]::WriteAllText($path,$content,(New-Object System.Text.UTF8Encoding($false)))
}
function CopyOriginal([string]$src,[string]$dest) {
  if(!(Test-Path -LiteralPath $src)){throw "PDF ausente no ZIP: "+$src}
  if(Test-Path -LiteralPath $dest){
    $s=(Get-Item -LiteralPath $src).Length
    $d=(Get-Item -LiteralPath $dest).Length
    if($s -eq $d){return}
    $backup=Join-Path $script:backup ("PDFs\"+[IO.Path]::GetFileName($dest))
    New-Item -ItemType Directory -Force -Path (Split-Path -Parent $backup) | Out-Null
    Copy-Item -LiteralPath $dest -Destination $backup -Force
  }
  Copy-Item -LiteralPath $src -Destination $dest -Force
}

Info "INSTALADOR V4 - 05/11/2026 - versao sem cache"
Info "Localizando a pasta da plataforma e os simulados..."
$project = FindProject
if(!$project) { throw "Nao localizei a pasta mentoria-tita. Abra o PowerShell dentro dela e cole o mesmo comando." }
$archive = FindZip
if(!$archive) { throw "O ZIP original nao foi encontrado em Downloads, Desktop ou Documents. O arquivo SIMULADOS_PMAL_DIAS_01_A_07 precisa continuar no computador." }
Info ("Projeto encontrado: "+$project)
Info ("Arquivo encontrado: "+$archive.FullName)
$temp = Join-Path $env:TEMP ("tita-simulados-auto-"+[guid]::NewGuid().ToString("N"))
$backup = Join-Path $project (".tita-backups\simulados-auto-"+(Get-Date -Format "yyyyMMdd-HHmmss"))
New-Item -ItemType Directory -Path $temp -Force | Out-Null

try {
  Info "Extraindo os sete dias automaticamente..."
  Expand-Archive -LiteralPath $archive.FullName -DestinationPath $temp -Force

  # Se o pacote completo ja existir, seu instalador original e aproveitado.
  $existing = @(Get-ChildItem -LiteralPath $temp -Recurse -File -Filter "INSTALAR.cjs" -ErrorAction SilentlyContinue |
    Where-Object { Test-Path -LiteralPath (Join-Path $_.DirectoryName "arquivos\private\simulados-pmal\manifest.json") } | Select-Object -First 1)
  if($existing.Count -gt 0) {
    Info "Encontrei o pacote completo. Instalando todos os dias..."
    Push-Location $project
    try { & node $existing[0].FullName; if($LASTEXITCODE -ne 0){throw "Instalador retornou erro."} }
    finally { Pop-Location }
  } else {
    $days = @(Get-ChildItem -LiteralPath $temp -Recurse -Directory -ErrorAction SilentlyContinue |
      Where-Object { $_.Name -match '^DIA_0[1-7]__' } | Sort-Object Name)
    if($days.Count -ne 7) { throw "ZIP incompleto: encontrei "+$days.Count+" pastas de dia. Esperados 7." }
    Info "Copiando as provas originais, sem alterar enunciados nem gabaritos..."
    $pdfs = Join-Path $project "private\simulados-pmal\pdfs"
    New-Item -ItemType Directory -Force -Path $pdfs | Out-Null
    foreach($day in $days){
      $n = [int]([regex]::Match($day.Name,'^DIA_([0-9]{2})').Groups[1].Value)
      $prefix = "dia-{0:D2}" -f $n
      $geral = @(Get-ChildItem -LiteralPath $day.FullName -Directory | Where-Object { $_.Name -ne "MINISSIMULADO" } | Select-Object -First 1)
      if($geral.Count -ne 1){throw "Nao achei o simulado geral do dia "+$n}
      CopyOriginal (Join-Path $geral[0].FullName "01_PROVA.pdf") (Join-Path $pdfs ($prefix+"-geral-prova.pdf"))
      if(Test-Path -LiteralPath (Join-Path $geral[0].FullName "03_GABARITO_COMENTADO.pdf")){
        CopyOriginal (Join-Path $geral[0].FullName "03_GABARITO_COMENTADO.pdf") (Join-Path $pdfs ($prefix+"-geral-comentado.pdf"))
      }
      if(Test-Path -LiteralPath (Join-Path $geral[0].FullName "02_GABARITO.pdf")){
        CopyOriginal (Join-Path $geral[0].FullName "02_GABARITO.pdf") (Join-Path $pdfs ($prefix+"-geral-gabarito.pdf"))
      }
      $mini = Join-Path $day.FullName "MINISSIMULADO"
      if(Test-Path -LiteralPath $mini) {
        CopyOriginal (Join-Path $mini "01_QUESTOES.pdf") (Join-Path $pdfs ($prefix+"-mini-prova.pdf"))
        CopyOriginal (Join-Path $mini "03_COMENTADO.pdf") (Join-Path $pdfs ($prefix+"-mini-comentado.pdf"))
      }
    }
    $count=@(Get-ChildItem -LiteralPath $pdfs -File -Filter "dia-*.pdf").Count
    if($count -ne 25){throw "Esperados 25 PDFs originais; encontrei "+$count+"."}

    Info "Instalando a interface e as rotas protegidas..."
    $mapping = @(
      @("estudos-simulados.tsx","components\estudos-simulados.tsx"),
      @("page.tsx","app\estudos\simulados\page.tsx"),
      @("catalog-route.ts","app\api\estudos\simulados\route.ts"),
      @("pdf-route.ts","app\api\estudos\simulados\pdf\[arquivo]\route.ts")
    )
    foreach($map in $mapping) {
      WriteUtf8 (Join-Path $project $map[1]) (GetText $map[0])
    }

    Info "Instalando os 1.040 gabaritos e paginas..."
    $encoded=(GetText "catalogo.zlib.base64").Trim()
    $blob=[Convert]::FromBase64String($encoded)
    if($blob.Length -lt 12){throw "Catalogo compactado invalido."}
    $stream=New-Object System.IO.MemoryStream
    $stream.Write($blob,2,$blob.Length-6)
    $stream.Position=0
    $inflater=New-Object System.IO.Compression.DeflateStream($stream,[System.IO.Compression.CompressionMode]::Decompress)
    $reader=New-Object System.IO.StreamReader($inflater,[Text.Encoding]::UTF8)
    $json=$reader.ReadToEnd()
    $reader.Dispose()
    # V4 - Count actual records, not PowerShell's array wrapper.
    # Windows PowerShell 5.1 can return a JSON array as one pipeline object.
    $parsed=ConvertFrom-Json -InputObject $json
    if($null -ne $parsed -and $null -ne $parsed.PSObject.Properties["simulados"]){
      $rawCatalog=$parsed.simulados
    } else {
      $rawCatalog=$parsed
    }
    $catalogItems=@($rawCatalog | ForEach-Object { $_ } | Where-Object { $null -ne $_ -and $null -ne $_.questoes })
    $provas=($catalogItems | Measure-Object).Count
    $total=0
    foreach($exam in $catalogItems){
      $total+=@($exam.questoes).Count
    }
    if($provas -ne 13 -or $total -ne 1040){
      throw ("Catalogo realmente incompleto. Encontrados {0} simulados e {1} questoes. Necessario 13/1040." -f $provas,$total)
    }
    Info ("Catalogo VALIDADO: {0} simulados, {1} questoes." -f $provas,$total)
    WriteUtf8 (Join-Path $project "private\simulados-pmal\manifest.json") $json

    $nav=Join-Path $project "components\app-topbar.tsx"
    if(Test-Path -LiteralPath $nav){
      $content=[IO.File]::ReadAllText($nav)
      if(!$content.Contains('href: "/estudos/simulados"')){
        $newItem='  { href: "/estudos/simulados", label: "Estudos · Simulados", icon: BookOpenCheck },'
        $match=[regex]::Match($content,'(?m)^[ \t]*\{ href: "/questoes".*$')
        if($match.Success){$content=$content.Insert($match.Index,$newItem+[Environment]::NewLine)}
        else { Write-Warning "A pagina funciona em /estudos/simulados, mas a linha de menu nao foi localizada." }
        WriteUtf8 $nav $content
      }
    }
    $ignore=Join-Path $project ".gitignore"
    $ignoreText=if(Test-Path $ignore){[IO.File]::ReadAllText($ignore)}else{""}
    if(!$ignoreText.Contains("/private/simulados-pmal/")){
      WriteUtf8 $ignore ($ignoreText+[Environment]::NewLine+"/private/simulados-pmal/"+[Environment]::NewLine)
    }
    Info ("Conteudo pronto: 7 dias, 13 simulados, "+$total+" questoes e "+$count+" PDFs.")
  }
  if(!(Get-Command node -ErrorAction SilentlyContinue)) {throw "Node.js nao esta no PATH; abra a mesma janela usada para iniciar a TITÃ."}
  $running=$false
  try { $running= (Test-NetConnection -ComputerName "127.0.0.1" -Port 3000 -InformationLevel Quiet -WarningAction SilentlyContinue) } catch {}
  if(!$running) {
    Info "Iniciando a TITÃ automaticamente..."
    Start-Process -FilePath "cmd.exe" -ArgumentList "/k","npm.cmd run dev" -WorkingDirectory $project
    Start-Sleep -Seconds 4
  } else { Info "A TITÃ ja esta aberta na porta 3000. Atualize o navegador se necessario." }
  Info "Instalacao concluida."
  Start-Process "http://localhost:3000/estudos/simulados"
} finally {
  try { Remove-Item -LiteralPath $temp -Recurse -Force -ErrorAction SilentlyContinue } catch {}
}
