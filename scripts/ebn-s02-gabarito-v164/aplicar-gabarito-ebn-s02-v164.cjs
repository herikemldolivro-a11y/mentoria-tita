"use strict";
// MT_EBN_S02_OFFICIAL_GABARITO_V164
// Official source: EBN Simulado 02 PMAL Soldado, 2026, commented PDF page 2.
// PDF SHA256: a20cd90039c45a3ea5e6014c257b7f70cadbbe58af4dadfa2406e45939ebdcfb
// No questions, PDF references, selected answers, user notes or schedules are changed.
const fs=require("fs"),path=require("path");
const root=path.resolve(process.argv[2]||process.cwd());
const rel="private/simulados-pmal/manifest.json";
const target=path.join(root,rel);
const ID="dia-08-s1";
const KEY="EECEEECCECCCCCEECEEECECECCECCEECCECECEEECECECECEECCECECECEECEEEEECECCEECCECECCEECCECCECCEECEECCCECCCEEECECEECCEEECCCECEE";
const SOURCE_PDF="sim08a24_207ae947d6bb53d9926fb4.pdf";
const KEY_PDF="sim08a24_a20cd90039c45a3ea5e601.pdf";
function check(ok,msg){if(!ok)throw new Error(msg);}
function out(s){console.log("[TITÃ EBN S02] "+s);}
function validateAndPatch(json){
 const items=Array.isArray(json)?json:json&&json.simulados;
 check(Array.isArray(items),"manifest.json sem lista de simulados. Nenhuma alteração.");
 const matching=items.filter(s=>s && s.id===ID);
 check(matching.length===1,"O simulado EBN S02 deve aparecer uma única vez. Encontrados: "+matching.length+". Nenhuma alteração.");
 const s=matching[0];
 check(s.dia===8 && /EBN/i.test(s.titulo||"") && /S02/i.test(s.titulo||""),
  "O ID dia-08-s1 não corresponde à prova EBN S02. Nenhuma alteração.");
 check(s.arquivos?.prova===SOURCE_PDF && s.arquivos?.comentado===KEY_PDF,
  "Os PDFs da atividade não correspondem aos arquivos originais conferidos. Nenhuma alteração.");
 check(Array.isArray(s.questoes)&&s.questoes.length===120&&KEY.length===120,
  "A prova deve conter exatamente 120 itens.");
 check(KEY.replace(/[CE]/g,"")==="" && KEY.split("C").length-1===58 && KEY.split("E").length-1===62,
  "Gabarito EBN não passou na validação interna.");
 const nums=new Set(s.questoes.map(q=>q?.numero));
 check(nums.size===120 && [...nums].every(n=>Number.isInteger(n)&&n>=1&&n<=120),
  "A numeração do simulado não corresponde aos itens 1 a 120.");
 // If a graded answer already exists, only accept an exact match: do not silently change keys.
 const conflicts=s.questoes.filter(q=>{
   const existing=String(q.gabarito??"").trim().toUpperCase();
   return existing!=="" && existing!=="?" && existing!=="PENDENTE" &&
      existing!=="NÃO CONFIRMADO" && existing!==KEY[q.numero-1];
 });
 check(conflicts.length===0,
  "Foram encontrados "+conflicts.length+" gabaritos divergentes no arquivo local (questões: "+
  conflicts.map(q=>q.numero).join(",")+"). Nenhuma alteração foi realizada.");
 let updated=0;
 for(const q of s.questoes){
  const correct=KEY[q.numero-1];
  if(q.gabarito!==correct){q.gabarito=correct;updated++;}
  q.gabaritoValidado=true;
 }
 s.status_gabarito="120/120 gabaritos confirmados — EBN Simulado 02 pós-edital PMAL Soldado 2026";
 s.fonte_gabarito="EBN GABARITO COMENTADO 02, página 2, PDF SHA256 a20cd90039c45a3ea5e6014c257b7f70cadbbe58af4dadfa2406e45939ebdcfb";
 s.gabarito_atualizado_em="2026-11-17";
 return {json,updated};
}
function main(){
 check(fs.existsSync(path.join(root,"package.json")),"Pasta TITÃ não encontrada.");
 check(fs.existsSync(target),"Catálogo local não encontrado: "+rel+". Instale primeiro os simulados.");
 const original=fs.readFileSync(target,"utf8");
 const bom=original.charCodeAt(0)===0xFEFF?"\uFEFF":"";
 let parsed;
 try{parsed=JSON.parse(original.replace(/^\uFEFF/,""));}catch{throw new Error("manifest.json contém JSON inválido. Nenhuma alteração.");}
 const result=validateAndPatch(parsed);
 const newline=original.includes("\r\n")?"\r\n":"\n";
 const updated=bom+JSON.stringify(result.json,null,2).replace(/\n/g,newline)+newline;
 if(result.updated===0 && original===updated){
   out("Os 120 gabaritos oficiais já estão aplicados. Basta Ctrl+F5.");
   return;
 }
 const backups=path.join(root,".tita-backups");
 fs.mkdirSync(backups,{recursive:true});
 const backup=path.join(backups,"simulados-manifest-before-ebn-s02-v164-"+new Date().toISOString().replace(/[:.]/g,"-")+".json");
 fs.copyFileSync(target,backup);
 try{
   const temp=target+".ebn-s02-"+process.pid+".tmp";
   fs.writeFileSync(temp,updated,"utf8");
   try{
     fs.renameSync(temp,target);
   }catch(e){
     try{fs.copyFileSync(temp,target);fs.rmSync(temp,{force:true});}
     catch(e2){try{fs.copyFileSync(backup,target);}catch{}throw e2;}
   }
   const saved=JSON.parse(fs.readFileSync(target,"utf8").replace(/^\uFEFF/,""));
   const ls=Array.isArray(saved)?saved:saved.simulados;
   const sim=ls.find(x=>x.id===ID);
   check(sim && sim.questoes.length===120 && sim.questoes.every(q=>q.gabarito===KEY[q.numero-1]),
     "Falha na conferência dos 120 gabaritos gravados.");
 }catch(e){try{fs.copyFileSync(backup,target);}catch{}throw e;}
 out("SUCESSO: "+result.updated+" gabaritos atualizados; prova EBN Dia 08 agora tem 120/120 chaves C/E.");
 out("Outros simulados, PDFs, respostas salvas e revisões foram preservados.");
 out("Backup: "+backup);
 out("Com a TITÃ aberta, pressione Ctrl+F5 em /estudos/simulados. Se ainda vir 404, corrija primeiro a rota do catálogo.");
}
try{main();}catch(e){
 console.error("[TITÃ EBN S02] ERRO: "+(e instanceof Error?e.message:String(e)));process.exitCode=1;
}
