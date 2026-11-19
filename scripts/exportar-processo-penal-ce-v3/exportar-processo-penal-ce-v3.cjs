"use strict";
// MT_TITA_EXPORT_PROCESSO_PENAL_EXCLUSIVO_CERTO_ERRADO_V3
// Executa localmente. Dados e credenciais nunca são enviados ao GitHub.
const fs=require("fs");
const path=require("path");
const os=require("os");
const {spawnSync}=require("child_process");
const {pathToFileURL}=require("url");
const project=path.resolve(process.argv[2]||process.cwd());
const output=path.resolve(process.env.TITA_EXPORT_OUTPUT_DIR||path.join(project,"EXPORTACOES","PROCESSO_PENAL_COMUM_SOMENTE_CERTO_ERRADO_V3"));
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
 info("Identificando plano CFO PMAL 2026 e matéria Processo Penal (COMUM, não militar)...");
 const {data:p,error:ep}=await supabase.from("study_plans")
   .select("id,name,slug").eq("slug","cfo-pmal-2026").maybeSingle();
 must(p,ep,"Plano");
 if(!p)throw Error("Plano CFO PMAL não encontrado ou sem permissão de leitura.");
 const {data:s,error:es}=await supabase.from("study_subjects")
   .select("id,name,slug").eq("plan_id",p.id).eq("slug","processo-penal").maybeSingle();
 must(s,es,"Matéria");
 if(!s)throw Error("Matéria Processo Penal COMUM não encontrada. Verifique slug processo-penal.");
 let questions=[],offset=0,expected=null;
 const pageSize=200;
 while(true){
   const {data,error,count}=await supabase.from("questions")
     .select("id,lesson_id,statement,choices,question_type,level,banca,ano,exam_name,source_code,source_type,active,created_at",{count:"exact"})
     .eq("plan_id",p.id).eq("subject_id",s.id).eq("question_type","true_false")
     .order("created_at",{ascending:true}).order("id",{ascending:true})
     .range(offset,offset+pageSize-1);
   must(data,error,"Buscar questões "+(offset+1));
   if(!data?.length)break;
   if(expected===null)expected=count;
   questions.push(...data);offset+=data.length;
   info("Carregadas "+questions.length+" de "+(count??"?")+" questões");
   if(data.length<pageSize||(typeof count==="number"&&offset>=count))break;
   if(questions.length>10000)throw Error("Limite de segurança da exportação excedido.");
 }
 if(!questions.length)throw Error("Nenhuma questão Certo/Errado encontrada.");
 if(expected!==null&&questions.length!==expected)throw Error("Paginação incompleta: "+questions.length+"/"+expected+". Nenhum arquivo gerado.");
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
     throw Error("Gabaritos e comentários indisponíveis: "+error.message+". Entre como ADMIN da TITÃ. Nenhum arquivo incompleto será gerado.");
   }
   for(const key of data??[])keys.set(key.question_id,key);
 }
 if(keys.size!==questions.length)throw Error("Gabaritos incompletos: "+keys.size+"/"+questions.length+". Acesso ADMIN necessário.");
 const rows=questions.map(q=>{
   const key=keys.get(q.id);
   if(q.question_type!=="true_false"||!key||!safe(q.statement).trim()||!safe(key.explanation).trim()||!["TRUE","FALSE"].includes(safe(key.correct_answer).toUpperCase()))throw Error("Enunciado, comentário ou gabarito C/E ausente na questão "+q.id+". Nenhum arquivo incompleto será criado.");
   return {
     id:q.id,assunto:lessons.get(q.lesson_id)||"Sem assunto",
     enunciado:safe(q.statement),alternativas:[],
     gabarito:key?safe(key.correct_answer):"",
     gabarito_ce:(key&&q.question_type==="true_false")?(safe(key.correct_answer).toUpperCase()==="TRUE"?"C":safe(key.correct_answer).toUpperCase()==="FALSE"?"E":""):"",
     comentario:key?safe(key.explanation):"",
     banca:safe(q.banca),ano:q.ano??"",prova:safe(q.exam_name),
     codigo_fonte:safe(q.source_code),
     origem:safe(q.source_type),
     nivel:q.level??"",tipo:safe(q.question_type),
     situacao:q.active?"Ativa":"Inativa",
     data_cadastro:q.created_at,
   };
 });
 rows.sort((a,b)=>{
   const t=a.assunto.localeCompare(b.assunto,"pt-BR");
   return t||a.data_cadastro.localeCompare(b.data_cadastro)||a.id.localeCompare(b.id);
 });
 rows.forEach((r,i)=>r.numero=i+1);
  const canon=t=>safe(t).normalize("NFKC").toLocaleLowerCase("pt-BR").replace(/\s+/g," ").trim();
  const index=new Map();
  for(const r of rows){
    const c=canon(r.enunciado),duplicate=index.get(c);
    if(duplicate&&duplicate.gabarito_ce!==r.gabarito_ce)throw Error("Enunciados iguais com gabaritos diferentes: "+duplicate.id+" / "+r.id);
    if(duplicate)r.duplicada_de=duplicate.numero;else index.set(c,r);
    const comment=canon(r.comentario),alerts=[];
    if(comment.includes("na ação penal pública condicionada, a representação do legitimado funciona"))
      alerts.push("COMENTÁRIO PADRÃO REPETIDO — conferir se corresponde ao enunciado");
    if(comment.includes("a alternativa assinalada corresponde ao gabarito oficial do caderno-fonte"))
      alerts.push("COMENTÁRIO GENÉRICO — verificar fundamento na fonte");
    if(/texto (?:acima|abaixo|anterior|precedente)|figura (?:abaixo|acima)|gráfico (?:abaixo|a seguir)/i.test(r.enunciado))
      alerts.push("POSSÍVEL TEXTO-BASE OU FIGURA EXTERNA — consultar prova original");
    if(canon(r.banca)==="simulado cebraspe")
      alerts.push("BANCA SIMULADO CEBRASPE — não usar como prova real");
    r.alertas=alerts;
  }
 return {rows,questionsCount:rows.length,keysCount:keys.size,plan:p.name,subject:s.name,restricted};
}
function writeFiles(d){
 fs.mkdirSync(output,{recursive:true});
 const prefix="PROCESSO_PENAL_COMUM_SOMENTE_CERTO_ERRADO_2026_"+d.rows.length+"_QUESTOES";
 const keys=["numero","id","assunto","tipo","enunciado","alternativas","gabarito","gabarito_ce","comentario","banca","ano","prova","codigo_fonte","origem","nivel","situacao"];
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
   "QUESTÃO "+r.numero+" · "+r.assunto+" · "+r.situacao+" · ID: "+r.id,
   "ENUNCIADO COMPLETO (DO BANCO):",r.enunciado,
   "GABARITO: "+(r.gabarito_ce==="C"?"CERTO (C)":"ERRADO (E)")+" · ORIGINAL: "+r.gabarito,
   "COMENTÁRIO INTEGRAL (DO BANCO):",r.comentario,
   "BANCA: "+r.banca+" · ANO: "+r.ano+" · PROVA: "+r.prova,
    "CÓDIGO DA FONTE: "+r.codigo_fonte+" · ORIGEM: "+r.origem,
    ...(r.alertas||[]).map(a=>"ALERTA: "+a),
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
       '<div class="key"><b>Gabarito: </b>'+html(r.gabarito_ce==="C"?"CERTO (C)":"ERRADO (E)")+
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

 // Arquivos separados para a APOSTA FINAL: somente questões de provas identificadas como CEBRASPE.
 // A banca "Simulado Cebraspe" fica fora desta seleção; continua no arquivo completo.
 const sprint=d.rows.filter(r=>r.banca.trim().toLowerCase()==="cebraspe" &&
   r.origem.trim().toLowerCase()==="real" && r.tipo==="true_false");
 const fmt=r=>[
   "QUESTÃO "+r.numero+" | ASSUNTO: "+r.assunto+" | IDENTIFICADOR: "+r.id,
   "BANCA: "+r.banca+" | ANO: "+r.ano+" | PROVA: "+r.prova,
   "FONTE: "+r.codigo_fonte+" | ORIGEM CADASTRADA: "+r.origem,
   "ENUNCIADO COMPLETO (DO BANCO): "+r.enunciado,
   "GABARITO C/E: "+(r.gabarito_ce||"NÃO DISPONÍVEL COM ESTE ACESSO"),
   "GABARITO ORIGINAL: "+(r.gabarito||"NÃO DISPONÍVEL COM ESTE ACESSO"),
   "COMENTÁRIO INTEGRAL (DO BANCO): "+r.comentario,
    ...(r.alertas||[]).map(a=>"ALERTA: "+a),
 ].join("\n");
 const sprintPrefix="SPRINT_CEBRASPE_REAL_CERTO_ERRADO_"+sprint.length+"_QUESTOES";
 const sprintTxt=path.join(output,sprintPrefix+".txt");
 const sprintJson=path.join(output,sprintPrefix+".json");
 const sprintCsv=path.join(output,sprintPrefix+".csv");
 const sprintHeader="PROCESSO PENAL COMUM · CFO PMAL · CEBRASPE C/E · QUESTÕES CADASTRADAS COMO REAIS\n"+
  "Fonte: banco de questões TITÃ. Confira o código da fonte antes de escolher para a APOSTA FINAL.\n"+
  "Não inclui a banca 'Simulado Cebraspe'. Não foram geradas questões inéditas.\n"+
  "TOTAL: "+sprint.length+" questões\n\n";
 fs.writeFileSync(sprintTxt,"\ufeff"+sprintHeader+sprint.map(fmt).join("\n\n"+"=".repeat(70)+"\n\n"),"utf8");
 fs.writeFileSync(sprintJson,JSON.stringify({tipo:"CEBRASPE real Certo/Errado",concurso:d.plan,materia:d.subject,total:sprint.length,questoes:sprint},null,2),"utf8");
 const sprintKeys=["numero","id","assunto","tipo","enunciado","gabarito","gabarito_ce","comentario","banca","ano","prova","codigo_fonte","origem","nivel","situacao"];
 fs.writeFileSync(sprintCsv,"\ufeff"+[sprintKeys.join(";"),...sprint.map(r=>sprintKeys.map(k=>csv(r[k])).join(";"))].join("\r\n"),"utf8");
 const lessons=[...new Set(d.rows.map(r=>r.assunto))].sort((a,b)=>a.localeCompare(b,"pt-BR"));
 const lessonFiles=[];
 for(const name of lessons){
   const rows=d.rows.filter(r=>r.assunto===name);
   const folder=name.normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-zA-Z0-9]+/g,"_").replace(/^_|_$/g,"").toUpperCase().slice(0,70);
   const fname=path.join(output,"ASSUNTO_"+folder+"_"+rows.length+"_QUESTOES.txt");
   fs.writeFileSync(fname,"\ufeffPROCESSO PENAL COMUM · "+name+" · "+rows.length+" QUESTÕES\n\n"+
      rows.map(fmt).join("\n\n"+"-".repeat(70)+"\n\n"),"utf8");
   lessonFiles.push(fname);
 }
 const report=[
 "TITÃ · EXPORTAÇÃO COMPLETA DE PROCESSO PENAL COMUM CFO PMAL",
 "Plano: "+d.plan,
 "Matéria no banco: "+d.subject,
 "Total exportado: "+d.rows.length+" questões",
 "Itens com gabarito acessível: "+d.rows.filter(r=>r.gabarito).length,
 "Itens com comentário acessível: "+d.rows.filter(r=>r.comentario).length,
 "Questões cadastradas como CEBRASPE real e Certo/Errado: "+sprint.length,
 "Questões com banca rotulada 'Simulado Cebraspe' (excluídas do arquivo de sprint): "+d.rows.filter(r=>r.banca.trim().toLowerCase()==="simulado cebraspe").length,
 "Questões por assunto:",
 ...lessons.map(name=>" - "+name+": "+d.rows.filter(r=>r.assunto===name).length),
 "NENHUMA questão nova foi criada. Nenhum registro, gabarito, resposta ou revisão foi alterado.",
 "Arquivo integral contém apenas C/E, sem excluir duplicatas; nenhuma questão de múltipla escolha é exportada.",
 "A classificação 'real' vem dos metadados do banco; confirme as fontes individuais antes de publicar.",
 "O PDF completo é gerado em etapa posterior quando Edge/Chrome estão disponíveis."
 ].join("\n");
 const reportFile=path.join(output,"LEIA_PRIMEIRO_RESUMO_E_FILTROS.txt");
 fs.writeFileSync(reportFile,"\ufeff"+report+"\n","utf8");

 
  // Versão CEBRASPE sem duplicatas, exclusivamente Certo/Errado.
  const normalized=t=>safe(t).normalize("NFKC").toLocaleLowerCase("pt-BR").replace(/\s+/g," ").trim();
  const marked=new Set();
  const unique=sprint.filter(r=>{
    const key=normalized(r.enunciado);
    if(marked.has(key))return false;
    marked.add(key);return true;
  });
  const prefixUnique="CEBRASPE_CE_"+unique.length+"_QUESTOES_UNICAS_PARA_SPRINT";
  const uniqueTxt=path.join(output,prefixUnique+".txt");
  const uniqueJson=path.join(output,prefixUnique+".json");
  fs.writeFileSync(uniqueTxt,"\ufeffCEBRASPE REAL C/E · "+unique.length+" QUESTÕES SEM DUPLICATAS\n"+
    "Gabaritos e comentários retirados da TITÃ; a fonte original ainda deve ser conferida.\n\n"+
    unique.map(fmt).join("\n\n"+"=".repeat(74)+"\n\n"),"utf8");
  fs.writeFileSync(uniqueJson,JSON.stringify({tipo:"true_false",total:unique.length,questoes:unique},null,2),"utf8");
  const flagged=d.rows.filter(r=>(r.alertas||[]).length>0);
  const auditTxt=path.join(output,"AUDITORIA_"+flagged.length+"_ITENS_COM_ALERTAS.txt");
  fs.writeFileSync(auditTxt,"\ufeffITENS QUE PRECISAM DE CONFERÊNCIA COM A PROVA. Não significa que os gabaritos estejam errados.\n\n"+
    flagged.map(r=>"ALERTAS: "+r.alertas.join(" | ")+"\n"+fmt(r)).join("\n\n"+"-".repeat(74)+"\n\n"),"utf8");
  const distinct=new Set(d.rows.map(r=>normalized(r.enunciado))).size;
  const repetitive=d.rows.filter(r=>r.alertas.some(a=>a.includes("COMENTÁRIO PADRÃO"))).length;
  const vague=d.rows.filter(r=>r.alertas.some(a=>a.includes("COMENTÁRIO GENÉRICO"))).length;
  const reportV3=[
    "AUDITORIA V3 · PROCESSO PENAL COMUM · SOMENTE CERTO/ERRADO",
    "Questões C/E exportadas: "+d.questionsCount,
    "Questões de múltipla escolha exportadas: ZERO",
    "Enunciados distintos no banco: "+distinct,
    "CEBRASPE real C/E com duplicatas: "+sprint.length,
    "CEBRASPE real C/E sem duplicatas: "+unique.length,
    "Banca Simulado Cebraspe fora da lista de provas reais: "+d.rows.filter(r=>normalized(r.banca)==="simulado cebraspe").length,
    "Comentários padrão repetidos: "+repetitive,
    "Comentários genéricos: "+vague,
    "Registros com qualquer alerta: "+flagged.length,
    "Todos os itens deste pacote têm enunciado, gabarito TRUE/FALSE e comentário não vazio no banco.",
    "IMPORTANTE: existir gabarito e comentário não é prova de conferência independente.",
    "A versão integral mantém duplicatas. Somente a versão para sprints remove enunciados repetidos.",
    "Nenhuma questão, resposta, gabarito ou revisão da TITÃ foi alterada."
  ].join("\n");
  const auditReport=path.join(output,"00_LEIA_PRIMEIRO_AUDITORIA_V3.txt");
  fs.writeFileSync(auditReport,"\ufeff"+reportV3+"\n","utf8");

 return {csvFile,jsonFile,htmlFile,txtFile,prefix,sprintTxt,sprintCsv,sprintJson,lessonFiles,reportFile,sprintCount:sprint.length,uniqueTxt,uniqueJson,auditTxt,auditReport,uniqueCount:unique.length,auditCount:flagged.length};
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
 info("CEBRASPE REAL C/E para os sprints: "+f.sprintCount);
 info("TXT específico de sprints: "+f.sprintTxt);
 info("CEBRASPE SEM DUPLICATAS: "+f.uniqueTxt);
 info("RELATÓRIO DE ALERTAS: "+f.auditReport);
 info("ITENS PARA AUDITORIA: "+f.auditCount);
 for(const name of f.lessonFiles)info("TXT por assunto: "+name);
 info("Leia o resumo: "+f.reportFile);
 info("Ativas: "+d.rows.filter(x=>x.situacao==="Ativa").length);
 info("Inativas: "+d.rows.filter(x=>x.situacao==="Inativa").length);
 if(d.questionsCount<323)info("AVISO: menos de 323 questões C/E encontradas; verifique alterações no banco.");
 if(d.keysCount!==d.questionsCount)info("ATENÇÃO: alguns gabaritos estão restritos. Para exportação completa entre com perfil ADMIN ou use chave de serviço armazenada localmente.");
 const pdf=tryPdf(f.htmlFile,f.prefix);
 info("Arquivos salvos em: "+output);
 for(const [name,full] of [["CSV",f.csvFile],["JSON",f.jsonFile],["HTML",f.htmlFile],["TXT",f.txtFile],["PDF",pdf]])
   if(full)info(name+" -> "+full);
 info("Nenhuma questão, revisão ou dado do Supabase foi alterado.");
}
main().catch(e=>{console.error("[TITÃ EXPORTAR] ERRO: "+(e instanceof Error?e.message:String(e)));process.exitCode=1;});
