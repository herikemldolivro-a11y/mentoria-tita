$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
try { [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 } catch {}
function Info([string]$m){Write-Host ('[TITA V15.3] '+$m) -ForegroundColor Cyan}
function ValidProject([string]$p){
 return ($p -and (Test-Path -LiteralPath (Join-Path $p 'package.json')) -and
  (Test-Path -LiteralPath (Join-Path $p 'components\simulado-exam-runner.tsx')) -and
  (Test-Path -LiteralPath (Join-Path $p 'components\estudos-simulados.tsx')))
}
$project=(Get-Location).Path
if(!(ValidProject $project)){
 $known=Join-Path $HOME 'Documents\Codex\2026-08-31\omo-conecto-meu-githuba-aq-x20\mentoria-tita'
 if(ValidProject $known){$project=$known}else{
   throw 'Nao encontrei a TITÃ com os componentes V15 instalados. Execute na pasta mentoria-tita.'
 }
}
if(!(Get-Command node -ErrorAction SilentlyContinue)){throw 'Node.js nao encontrado; seus arquivos nao foram alterados.'}
Info ('Projeto encontrado: '+$project)
Info 'Separando as questoes antigas da selecao MANUAL para a proxima revisao.'
$assets=Join-Path $env:TEMP ('tita-selecao-v153-'+[guid]::NewGuid().ToString('N'))
[IO.Directory]::CreateDirectory($assets)|Out-Null
$files=@(
 [PSCustomObject]@{ Name='simulado-exam-runner.tsx'; Relative='components\simulado-exam-runner.tsx'; Marker='MT_SIMULADO_MANUAL_SELECTION_V153' },
 [PSCustomObject]@{ Name='estudos-simulados.tsx'; Relative='components\estudos-simulados.tsx'; Marker='MT_SIMULADO_MANUAL_SELECTION_V153' }
)
try {
 $root='https://raw.githubusercontent.com/herikemldolivro-a11y/mentoria-tita/tita-simulados-revisao-universal-v15-20261109/scripts/simulados-universal-v15/'
 foreach($item in $files){
   $wc=New-Object System.Net.WebClient
   $wc.Encoding=[System.Text.Encoding]::UTF8
   $wc.Headers.Add('Cache-Control','no-cache')
   try { $content=$wc.DownloadString($root+$item.Name+'?v=20261109-v153r1') }
   finally { $wc.Dispose() }
   if(!$content.Contains($item.Marker) -or !$content.Contains('mt_simulado_round_selections')){
     throw ('Arquivo nao passou na validacao: '+$item.Name+'. Nada foi alterado.')
   }
   [IO.File]::WriteAllText((Join-Path $assets $item.Name),$content,(New-Object System.Text.UTF8Encoding($false)))
   Info ('Recebido e validado: '+$item.Name)
 }
 $check=Join-Path $assets 'check-v153.cjs'
 $checkCode=@'
const fs=require("fs"),path=require("path");
const root=process.cwd();
let ts;
try {ts=require(path.join(root,"node_modules","typescript"))}
catch {throw Error("TypeScript nao encontrado no projeto. Rode npm.cmd install primeiro; nada foi instalado.");}
for(const f of process.argv.slice(2)){
 const code=fs.readFileSync(f,"utf8");
 const ast=ts.createSourceFile(f,code,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 if(ast.parseDiagnostics.length){
  for(const err of ast.parseDiagnostics){
   const line=ast.getLineAndCharacterOfPosition(err.start||0).line+1;
   console.error("[TITA V15.3] ERRO de sintaxe "+path.basename(f)+":"+line+" "+ts.flattenDiagnosticMessageText(err.messageText,"\n"));
  }
  process.exitCode=1;
 }
}
if(!process.exitCode)console.log("[TITA V15.3] Sintaxe TSX valida em ambos os arquivos.");
'@
 [IO.File]::WriteAllText($check,$checkCode,(New-Object System.Text.UTF8Encoding($false)))
 Push-Location $project
 try{
  & node $check (Join-Path $assets 'simulado-exam-runner.tsx') (Join-Path $assets 'estudos-simulados.tsx')
  if($LASTEXITCODE -ne 0){throw 'Falha na sintaxe dos componentes. Nenhum arquivo alterado.'}
 }finally{Pop-Location}
 $backup=Join-Path $project ('.tita-backups\simulado-selecao-manual-v153-'+(Get-Date -Format 'yyyyMMdd-HHmmss'))
 $changes=New-Object 'System.Collections.Generic.List[string]'
 $oldContents=@{}
 foreach($item in $files){
   $dest=Join-Path $project $item.Relative
   $oldContents[$item.Relative]=[IO.File]::ReadAllText($dest)
   $newContent=[IO.File]::ReadAllText((Join-Path $assets $item.Name))
   if($oldContents[$item.Relative] -cne $newContent){
     $back=Join-Path $backup $item.Relative
     [IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($back))|Out-Null
     [IO.File]::Copy($dest,$back,$true)
   }
 }
 try{
  foreach($item in $files){
   $dest=Join-Path $project $item.Relative
   $newContent=[IO.File]::ReadAllText((Join-Path $assets $item.Name))
   if($oldContents[$item.Relative] -ceq $newContent){Info ('Ja atualizado: '+$item.Relative);continue}
   $stage=$dest+'.v153-'+[guid]::NewGuid().ToString('N')+'.tmp'
   try{
     [IO.File]::WriteAllText($stage,$newContent,(New-Object System.Text.UTF8Encoding($false)))
     [IO.File]::Copy($stage,$dest,$true)
     $changes.Add($item.Relative)
   }finally{
     if(Test-Path -LiteralPath $stage){Remove-Item -LiteralPath $stage -Force -ErrorAction SilentlyContinue}
   }
   $verify=[IO.File]::ReadAllText($dest)
   if($verify -cne $newContent){throw ('Conteudo divergente apos gravar '+$item.Relative)}
   Info ('Atualizado: '+$item.Relative)
  }
 }catch{
  foreach($rel in $changes){
   try{
    [IO.File]::WriteAllText((Join-Path $project $rel),$oldContents[$rel],(New-Object System.Text.UTF8Encoding($false)))
   }catch{Write-Host ('[TITA V15.3] Falha ao restaurar '+$rel+'; consulte backup '+$backup) -ForegroundColor Red}
  }
  throw ('Falha na instalacao; restauracao executada. '+$_.Exception.Message)
 }
 Write-Host '[TITA V15.3] SUCESSO: agora 0 questoes ficam PRESELECIONADAS para a proxima revisao.' -ForegroundColor Green
 Write-Host '[TITA V15.3] So entra na proxima revisao o que voce marcar no botao Salvar na revisao.' -ForegroundColor Green
 Write-Host '[TITA V15.3] Questões anteriores, respostas, PDF, calendario e cadernos preservados.' -ForegroundColor Green
 if($changes.Count -gt 0){Info ('Backup salvo: '+$backup)}
 Info 'Agora pressione Ctrl+F5 no navegador e reabra o simulado.'
} finally {
 try{Remove-Item -LiteralPath $assets -Force -Recurse -ErrorAction SilentlyContinue}catch{}
}
