"use strict";
// TITÃ · EXPORTAR DIREITO PENAL CFO PMAL · V1
// Executa localmente. Dados e credenciais nunca são enviados ao GitHub.
const fs=require("fs");
const path=require("path");
const os=require("os");
const {spawnSync}=require("child_process");
const {pathToFileURL}=require("url");
const project=path.resolve(process.argv[2]||process.cwd());
const output=path.resolve(process.env.TITA_EXPORT_OUTPUT_DIR||path.join(project,"EXPORTACOES","DIREITO_PENAL_CFO_PMAL"));
const url=process.env.TITA_EXPORT_URL||"";
const apiKey=process.env.TITA_EXPORT_API_KEY||"";
const jwt=process.env.TITA_EXPORT_JWT||"";
const service=process.env.TITA_EXPORT_SECRET_KEY||"";
if(!url||!(service||apiKey))throw Error("Configuração segura do Supabase ausente. Confira o .env.local.");
if(!fs.existsSync(path.join(project,"package.json")))throw Error("Projeto TITÃ não encontrado.");
const sdk=require(require.resolve("@supabase/supabase-js",{paths:[project]}));
const authKey=service||apiKey;
const supabase=sdk.createClient(url,authKey,{
 auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},
 global:jwt&&!service?{headers:{Authorization:"Bearer "+jwt}}:{},
});
function must(data,error,where){if(error)throw Error(where+": "+error.message);return data;}
function safe(v){return v===null||v===undefined?"":String(v);}
function html(v){return safe(v).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");}
function csv(v){
 let s=typeof v==="object"&&v!==null?JSON.stringify(v):safe(v);
 if(/^[\s]*[=+@-]/.test(s))s="'"+s; // protege contra execução de fórmulas no Excel
 return '"'+s.replace(/"/g,'""')+'"';
}
function getChoices(c){
 if(c===null||c===undefined)return [];
 if(typeof c==="string"){try{c=JSON.parse(c);}catch{return [{letter:"",text:c}]}}
 if(Array.isArray(c))return c.map((x,i)=>({letter:String.fromCharCode(65+i),text:safe(x)}));
 if(typeof c!=="object")return [];
 return Object.entries(c).sort(([a],[b])=>a.localeCompare(b)).map(([letter,text])=>({letter,text:safe(text)}));
}
function info(text){process.stdout.write("[TITÃ EXPORTAR] "+text+"\n");}
async function getAll(){
 info("Identificando plano CFO PMAL 2026 e matéria Direito Penal...");
 const {data:p,error:ep}=await supabase.from("study_plans")
   .select("id,name,slug").eq("slug","cfo-pmal-2026").maybeSingle();
 must(p,ep,"Plano");
 if(!p)throw Error("Plano CFO PMAL não encontrado ou sem permissão de leitura.");
 const {data:s,error:es}=await supabase.from("study_subjects")
   .select("id,name,slug").eq("plan_id",p.id).eq("slug","direito-penal").maybeSingle();
 must(s,es,"Matéria");
 if(!s)throw Error("Matéria Direito Penal não encontrada.");
 let questions=[],offset=0;
 const pageSize=200;
 while(true){
   const {data,error,count}=await supabase.from("questions")
     .select("id,lesson_id,statement,choices,question_type,level,banca,ano,exam_name,source_code,source_type,active,created_at",{count:"exact"})
     .eq("plan_id",p.id).eq("subject_id",s.id)
     .order("created_at",{ascending:true}).order("id",{ascending:true})
     .range(offset,offset+pageSize-1);
   must(data,error,"Buscar questões "+(offset+1));
   if(!data?.length)break;
   questions.push(...data);offset+=data.length;
   info("Carregadas "+questions.length+" de "+(count??"?")+" questões");
   if(data.length<pageSize||(typeof count==="number"&&offset>=count))break;
   if(questions.length>10000)throw Error("Limite de segurança da exportação excedido.");
 }
 if(!questions.length)throw Error("Nenhuma questão acessível com essa conta. Use uma conta de administrador da TITÃ.");
 const lessonIds=[...new Set(questions.map(x=>x.lesson_id).filter(Boolean))];
 const lessons=new Map();
 for(let i=0;i<lessonIds.length;i+=150){
   const {data,error}=await supabase.from("study_lessons").select("id,title").in("id",lessonIds.slice(i,i+150));
   must(data,error,"Assuntos");
   for(const l of data??[])lessons.set(l.id,l.title);
 }
 info("Procurando gabaritos e comentários autorizados...");
 const keys=new Map();
 let restricted=false;
 for(let i=0;i<questions.length;i+=150){
   const ids=questions.slice(i,i+150).map(x=>x.id);
   const {data,error}=await supabase.from("question_keys")
     .select("question_id,correct_answer,explanation").in("question_id",ids);
   if(error){
     restricted=true;
     info("Permissão de gabaritos não concedida: "+error.message);
     break;
   }
   for(const key of data??[])keys.set(key.question_id,key);
 }
 const rows=questions.map(q=>{
   const key=keys.get(q.id);
   return {
     id:q.id,assunto:lessons.get(q.lesson_id)||"Sem assunto",
     enunciado:safe(q.statement),alternativas:getChoices(q.choices),
     gabarito:key?safe(key.correct_answer):"",
     comentario:key?safe(key.explanation):"",
     banca:safe(q.banca),ano:q.ano??"",prova:safe(q.exam_name),
     codigo_fonte:safe(q.source_code),
     origem:safe(q.source_type),
     nivel:q.level??"",
     situacao:q.active?"Ativa":"Inativa",
     data_cadastro:q.created_at,
   };
 });
 rows.sort((a,b)=>{
   const t=a.assunto.localeCompare(b.assunto,"pt-BR");
   return t||a.data_cadastro.localeCompare(b.data_cadastro)||a.id.localeCompare(b.id);
 });
 rows.forEach((r,i)=>r.numero=i+1);
 return {rows,questionsCount:rows.length,keysCount:keys.size,plan:p.name,subject:s.name,restricted};
}
function writeFiles(d){
 fs.mkdirSync(output,{recursive:true});
 const prefix="DIREITO_PENAL_CFO_PMAL_2026_"+d.rows.length+"_QUESTOES";
 const keys=["numero","assunto","enunciado","alternativas","gabarito","comentario","banca","ano","prova","codigo_fonte","origem","nivel","situacao"];
 const header=keys.join(";");
 const contents=[header,...d.rows.map(row=>keys.map(key=>{
   const val=key==="alternativas"?row.alternativas.map(x=>(x.letter?x.letter+") ":"")+x.text).join("\n"):row[key];
   return csv(val);
 }).join(";"))].join("\r\n");
 const csvFile=path.join(output,prefix+".csv");
 const jsonFile=path.join(output,prefix+".json");
 const htmlFile=path.join(output,prefix+".html");
 const txtFile=path.join(output,prefix+".txt");
 const txt=d.rows.map(r=>[
   "QUESTÃO "+r.numero+" · "+r.assunto+" · "+r.situacao,
   r.enunciado,
   ...r.alternativas.map(x=>x.letter+") "+x.text),
   "GABARITO: "+(r.gabarito||"Não disponível com este acesso"),
   "COMENTÁRIO: "+(r.comentario||"Não disponível"),
   "BANCA: "+r.banca+" · ANO: "+r.ano,
 ].join("\n")).join("\n\n"+"-".repeat(70)+"\n\n");
 fs.writeFileSync(csvFile,"\ufeff"+contents,"utf8");
 fs.writeFileSync(jsonFile,JSON.stringify({concurso:d.plan,materia:d.subject,total:d.questionsCount,
   gabaritos:d.keysCount,questoes:d.rows},null,2),"utf8");
 fs.writeFileSync(txtFile,"\ufeff"+txt,"utf8");
 const byLesson=new Map();
 for(const r of d.rows){
   if(!byLesson.has(r.assunto))byLesson.set(r.assunto,[]);
   byLesson.get(r.assunto).push(r);
 }
 const sections=[...byLesson.entries()].map(([title,rows])=>{
   return '<section class="lesson"><h2>'+html(title)+' · '+rows.length+' questões</h2>'+
     rows.map(r=>'<article class="question"><p class="meta">QUESTÃO '+r.numero+
       ' · '+html(r.banca||"BANCA NÃO INFORMADA")+' · '+html(r.ano)+
       ' · '+html(r.situacao)+'</p><div class="statement">'+html(r.enunciado)+'</div>'+
       (r.alternativas.length?'<div class="choices">'+r.alternativas.map(x=>
         '<p><b>'+html(x.letter)+')</b> '+html(x.text)+'</p>').join("")+'</div>':"")+
       '<div class="key"><b>Gabarito: </b>'+html(r.gabarito||"Não disponível")+
       '<p><b>Comentário: </b>'+html(r.comentario||"Não disponível")+'</p></div></article>').join("")+
     '</section>';
 }).join("\n");
 const document='<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>'+
   html(d.plan)+" · "+html(d.subject)+'</title><style>'+
   '@page{size:A4;margin:15mm 14mm 18mm}*{box-sizing:border-box}'+
   'body{font:11pt/1.5 Arial,Helvetica,sans-serif;color:#17202c;margin:auto;max-width:190mm}'+
   'h1{font-size:24pt;margin-top:0}h2{color:#1c365a;font-size:16pt;border-bottom:2px solid #1c365a;padding-bottom:5px}'+
   'p{margin:8px 0}.intro{padding:14px;background:#eef2f7}.lesson{margin:30px 0 0}'+
   '.question{break-inside:avoid-page;border-bottom:1px solid #ddd;padding:14px 0}'+
   '.statement{font-size:11pt;white-space:pre-wrap;margin:9px 0}.choices p{white-space:pre-wrap;margin:4px 0 4px 12px}'+
   '.key{margin-top:10px;background:#f4f8ee;border-left:4px solid #568f43;padding:7px 11px;white-space:pre-wrap}'+
   '.meta{color:#637188;font-size:9pt;font-weight:bold}'+
   '@media print{.intro{-webkit-print-color-adjust:exact;print-color-adjust:exact}h2{break-after:avoid}}'+
   '</style></head><body><h1>'+html(d.plan)+'<br>'+html(d.subject)+'</h1>'+
   '<div class="intro"><b>Total de questões: '+d.questionsCount+
   '</b><br>Questões com gabarito: '+d.keysCount+
   '<br>Gerado a partir do banco da TITÃ, preservando os textos armazenados.</div>'+sections+'</body></html>';
 fs.writeFileSync(htmlFile,document,"utf8");
 return {csvFile,jsonFile,htmlFile,txtFile,prefix};
}
function tryPdf(htmlFile,prefix){
 const programFiles=[
  process.env["PROGRAMFILES(X86)"]||"C:\\Program Files (x86)",
  process.env.PROGRAMFILES||"C:\\Program Files",
 ];
 const candidates=[
  ...programFiles.map(base=>path.join(base,"Microsoft","Edge","Application","msedge.exe")),
  ...programFiles.map(base=>path.join(base,"Google","Chrome","Application","chrome.exe")),
 ];
 const browser=candidates.find(p=>fs.existsSync(p));
 if(!browser){info("Edge/Chrome não encontrado; HTML está pronto para imprimir em PDF.");return null;}
 const pdfFile=path.join(output,prefix+".pdf");
 const edgeTmp=fs.mkdtempSync(path.join(os.tmpdir(),"tita-questoes-edge-"));
 try{
  info("Gerando PDF offline no navegador (pode levar alguns instantes)...");
  const args=["--headless","--disable-gpu","--no-first-run","--no-default-browser-check",
    "--no-pdf-header-footer","--print-to-pdf="+pdfFile,"--user-data-dir="+edgeTmp,pathToFileURL(htmlFile).href];
  const result=spawnSync(browser,args,{cwd:output,timeout:240000,windowsHide:true,encoding:"utf8"});
  if(result.error||result.status!==0||!fs.existsSync(pdfFile)||fs.statSync(pdfFile).size<1000){
    info("O PDF automático não foi concluído. Use o HTML para imprimir; CSV/JSON/TXT estão completos.");
    if(result.error)info("Motivo: "+result.error.message);
    return null;
  }
  return pdfFile;
 }finally{try{fs.rmSync(edgeTmp,{force:true,recursive:true});}catch{}}
}
async function main(){
 const d=await getAll();
 const f=writeFiles(d);
 info("==============================================");
 info("Exportadas: "+d.questionsCount+" questões");
 info("Gabaritos encontrados: "+d.keysCount);
 info("Ativas: "+d.rows.filter(x=>x.situacao==="Ativa").length);
 info("Inativas: "+d.rows.filter(x=>x.situacao==="Inativa").length);
 if(d.questionsCount<915)info("AVISO: menos de 915 encontradas; seu usuário talvez só tenha acesso às ativas.");
 if(d.keysCount!==d.questionsCount)info("ATENÇÃO: alguns gabaritos estão restritos. Para exportação completa entre com perfil ADMIN ou use chave de serviço armazenada localmente.");
 const pdf=tryPdf(f.htmlFile,f.prefix);
 info("Arquivos salvos em: "+output);
 for(const [name,full] of [["CSV",f.csvFile],["JSON",f.jsonFile],["HTML",f.htmlFile],["TXT",f.txtFile],["PDF",pdf]])
   if(full)info(name+" -> "+full);
 info("Nenhuma questão, revisão ou dado do Supabase foi alterado.");
}
main().catch(e=>{console.error("[TITÃ EXPORTAR] ERRO: "+(e instanceof Error?e.message:String(e)));process.exitCode=1;});
