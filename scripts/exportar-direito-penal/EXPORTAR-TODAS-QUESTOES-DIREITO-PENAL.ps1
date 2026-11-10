$ErrorActionPreference='Stop'
$ProgressPreference='SilentlyContinue'
try{[Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12}catch{}
function Info([string]$message){ Write-Host ('[TITA EXPORTAR] '+$message) -ForegroundColor Cyan }
function IsProject([string]$dir){
  return ($dir -and (Test-Path -LiteralPath (Join-Path $dir 'package.json')) -and
    (Test-Path -LiteralPath (Join-Path $dir 'lib\supabase\env.ts')))
}
$project=(Get-Location).Path
if(!(IsProject $project)){
  $known=Join-Path $HOME 'Documents\Codex\2026-08-31\omo-conecto-meu-githuba-aq-x20\mentoria-tita'
  if(IsProject $known){$project=$known}
  else{throw 'Pasta da TITÃ não encontrada. Execute na pasta mentoria-tita.'}
}
if(!(Get-Command node -ErrorAction SilentlyContinue)){throw 'Node.js não encontrado no computador.'}
if(!(Test-Path -LiteralPath (Join-Path $project 'node_modules\@supabase\supabase-js'))){
  throw 'As dependências da TITÃ não estão instaladas. Entre na pasta e execute npm.cmd install.'
}
Info ('Projeto: '+$project)
$settings=@{}
foreach($file in @('.env','.env.local')){
  $full=Join-Path $project $file
  if(!(Test-Path -LiteralPath $full)){continue}
  foreach($line in [IO.File]::ReadAllLines($full)){
    if($line -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$'){
      $key=$Matches[1];$value=$Matches[2].Trim()
      if(($value.StartsWith('"') -and $value.EndsWith('"')) -or
         ($value.StartsWith("'") -and $value.EndsWith("'"))){
        if($value.Length -ge 2){$value=$value.Substring(1,$value.Length-2)}
      }
      $settings[$key]=$value
    }
  }
}
function ValueOf([string[]]$keys){
  foreach($key in $keys){
    if($settings.ContainsKey($key) -and ![string]::IsNullOrWhiteSpace($settings[$key])){return $settings[$key]}
    $envVal=[Environment]::GetEnvironmentVariable($key,'Process')
    if(![string]::IsNullOrWhiteSpace($envVal)){return $envVal}
  }
  return ''
}
$url=ValueOf @('NEXT_PUBLIC_SUPABASE_URL','SUPABASE_URL')
$public=ValueOf @('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY','NEXT_PUBLIC_SUPABASE_ANON_KEY','SUPABASE_ANON_KEY')
$service=ValueOf @('SUPABASE_SERVICE_ROLE_KEY','SUPABASE_SECRET_KEY','SUPABASE_SERVICE_KEY')
if(!$url){throw 'NEXT_PUBLIC_SUPABASE_URL ausente do .env.local. Sem essa configuração a exportação não pode acessar seu projeto.'}
if(!$public -and !$service){throw 'Chave publicável do Supabase não encontrada no .env.local.'}
if(!$url.StartsWith('https://')){throw 'URL do Supabase inválida. Nenhuma credencial foi enviada.'}
$token=''
if(!$service){
  Info 'Você precisa autenticar um perfil ADMIN da TITÃ para exportar gabaritos e questões inativas.'
  $method=Read-Host 'Digite 1 para login com e-mail/senha da TITÃ ou 2 para informar a chave service_role'
  if($method -eq '2'){
    $secure=Read-Host 'Cole a chave service_role/secret do SEU projeto Supabase (não será exibida)' -AsSecureString
    $ptr=[IntPtr]::Zero
    try{
      $ptr=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
      $service=[Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
    }finally{
      if($ptr -ne [IntPtr]::Zero){[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)}
      Remove-Variable secure -ErrorAction SilentlyContinue
    }
    if([string]::IsNullOrWhiteSpace($service)){throw 'Nenhuma chave informada. Exportação cancelada.'}
  }else{
    if(!$public){throw 'Para login por senha é necessária a chave pública NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.'}
    $email=Read-Host 'E-mail do administrador usado no login da TITÃ'
    if([string]::IsNullOrWhiteSpace($email)){throw 'E-mail não informado. Exportação cancelada.'}
    $secure=Read-Host 'Senha da TITÃ (digitação oculta)' -AsSecureString
    $ptr=[IntPtr]::Zero
    try{
      $ptr=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
      $password=[Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
      $body=@{email=$email;password=$password} | ConvertTo-Json -Compress
      try{
        $resp=Invoke-RestMethod -Method Post -Uri ($url.TrimEnd('/')+'/auth/v1/token?grant_type=password') -Headers @{'apikey'=$public;'Content-Type'='application/json'} -Body $body -TimeoutSec 30
        $token=$resp.access_token
      }catch{
        throw 'Não foi possível autenticar por e-mail/senha na TITÃ. Se você usa login Google, reinicie o comando e escolha 2 (chave service_role).'
      }
    }finally{
      if($ptr -ne [IntPtr]::Zero){[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)}
      Remove-Variable password -ErrorAction SilentlyContinue
      Remove-Variable secure -ErrorAction SilentlyContinue
      Remove-Variable body -ErrorAction SilentlyContinue
    }
    if(!$token){throw 'Autenticação não retornou token. Exportação cancelada.'}
    Info 'Sessão autenticada. O arquivo será produzido inteiramente no seu computador.'
  }
}else{Info 'Acesso de serviço já configurado na pasta da TITÃ; nenhuma senha será solicitada.'}
$work=Join-Path $env:TEMP ('tita-exportar-penal-'+[guid]::NewGuid().ToString('N'))
[IO.Directory]::CreateDirectory($work)|Out-Null
$scriptFile=Join-Path $work 'exportar-direito-penal.cjs'
$output=Join-Path $project 'EXPORTACOES\DIREITO_PENAL_CFO_PMAL'
$src='https://raw.githubusercontent.com/herikemldolivro-a11y/mentoria-tita/tita-ingles-rotina-v160-20261110/scripts/exportar-direito-penal/exportar-direito-penal.cjs?v=20261110-penal-v1'
try{
  $wc=New-Object System.Net.WebClient
  $wc.Encoding=[System.Text.Encoding]::UTF8
  $wc.Headers.Add('Cache-Control','no-cache')
  try{$code=$wc.DownloadString($src)}finally{$wc.Dispose()}
  if(!$code.Contains('TITÃ · EXPORTAR DIREITO PENAL CFO PMAL · V1') -or $code.Length -lt 5000){
    throw 'Arquivo de exportação não passou na verificação. Nada foi baixado da base.'
  }
  [IO.File]::WriteAllText($scriptFile,$code,(New-Object System.Text.UTF8Encoding($false)))
  Info 'Iniciando exportação das questões do CFO PMAL ...'
  $env:TITA_EXPORT_URL=$url
  $env:TITA_EXPORT_API_KEY=$public
  $env:TITA_EXPORT_SECRET_KEY=$service
  $env:TITA_EXPORT_JWT=$token
  $env:TITA_EXPORT_OUTPUT_DIR=$output
  Push-Location $project
  try{
    & node $scriptFile $project
    if($LASTEXITCODE -ne 0){throw ('O exportador terminou com erro. Código: '+$LASTEXITCODE)}
  }finally{Pop-Location}
  Write-Host ('[TITA EXPORTAR] CONCLUÍDO! Arquivos em: '+$output) -ForegroundColor Green
  Info 'Para abrir a pasta: explorer.exe "'+$output+'"'
}finally{
  foreach($name in @('TITA_EXPORT_URL','TITA_EXPORT_API_KEY','TITA_EXPORT_SECRET_KEY','TITA_EXPORT_JWT','TITA_EXPORT_OUTPUT_DIR')){
    Remove-Item -Path ('Env:\'+$name) -ErrorAction SilentlyContinue
  }
  Remove-Variable service -ErrorAction SilentlyContinue
  Remove-Variable token -ErrorAction SilentlyContinue
  try{Remove-Item -LiteralPath $work -Recurse -Force -ErrorAction SilentlyContinue}catch{}
}
