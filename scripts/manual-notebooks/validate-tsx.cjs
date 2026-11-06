"use strict";
const fs=require("fs"),path=require("path");
const tsPath=path.join(process.cwd(),"node_modules","typescript");
let ts;
try{ts=require(tsPath)}catch(e){process.stdout.write("[TITA] TypeScript local nao encontrado; validacao de sintaxe ignorada.\n");process.exit(0)}
const files=process.argv.slice(2);
if(files.length<4)throw Error("Lista de fontes incompleta.");
let failures=0;
for(const file of files){
 const source=fs.readFileSync(file,"utf8");
 const syntax=ts.createSourceFile(path.basename(file),source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 const errors=syntax.parseDiagnostics;
 if(errors.length)for(const d of errors){
   const pos=syntax.getLineAndCharacterOfPosition(d.start||0);
   process.stderr.write("[TITA] ERRO SINTAXE "+path.basename(file)+":"+(pos.line+1)+":"+(pos.character+1)+": "+ts.flattenDiagnosticMessageText(d.messageText,"\n")+"\n");
   failures++;
 }
 else process.stdout.write("[TITA] Sintaxe OK: "+path.basename(file)+"\n");
}
if(failures)process.exit(1);
