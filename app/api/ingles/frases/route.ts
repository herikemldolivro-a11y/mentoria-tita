import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
export const dynamic="force-dynamic";
export const revalidate=0;
type WordRow={id:string;word:string;translation:string};
type PhraseRow={vocab_id:string;source:string};
function includesWord(sentence:string,word:string){
  const tokens=sentence.toLowerCase().match(/[a-z]+/g)??[];
  return tokens.includes(word.toLowerCase());
}
export async function POST(){
  try{
    const db=await createClient();
    const {data:auth,error:authError}=await db.auth.getUser();
    if(authError||!auth.user)return NextResponse.json({error:"Faça login para gerar frases."},{status:401});
    const key=process.env.OPENAI_API_KEY;
    if(!key)return NextResponse.json({error:"As 33 frases iniciais já foram criadas. Para gerar automaticamente frases das futuras favoritas, configure OPENAI_API_KEY no servidor. Enquanto isso, elas usam o contexto original."},{status:409});
    const {data:words,error}=await db.from("user_english_vocabulary").select("id,word,translation")
      .eq("user_id",auth.user.id).eq("starred",true).limit(150);
    if(error)throw error;
    const list=(words??[]) as WordRow[];
    if(!list.length)return NextResponse.json({ok:true,generated:0});
    const existing=await db.from("mt_english_favorite_phrases").select("vocab_id,source")
      .eq("user_id",auth.user.id).in("vocab_id",list.map(x=>x.id));
    if(existing.error)throw existing.error;
    const aiIds=new Set(((existing.data??[]) as PhraseRow[]).filter(x=>x.source==="ai").map(x=>x.vocab_id));
    const pending=list.filter(x=>!aiIds.has(x.id)).slice(0,10);
    if(!pending.length)return NextResponse.json({ok:true,generated:0});
    const response=await fetch("https://api.openai.com/v1/chat/completions",{
      method:"POST",
      headers:{"Content-Type":"application/json","Authorization":"Bearer "+key},
      body:JSON.stringify({
        model:process.env.OPENAI_PHRASE_MODEL||"gpt-4.1-mini",
        temperature:0.65,
        response_format:{type:"json_object"},
        messages:[
          {role:"system",content:"You are an English teacher. Return valid JSON only, with key sentences: an array of objects {id,sentence}. For each entry, write exactly one original, clear, grammatically correct A2-B1 English sentence that naturally CONTAINS the target word. No Portuguese, no numbering, no markdown. Preserve IDs exactly."},
          {role:"user",content:JSON.stringify({words:pending})},
        ],
      }),
      cache:"no-store",
    });
    if(!response.ok)throw Error("Serviço de IA indisponível: "+response.status);
    const raw=await response.json();
    const answer=raw?.choices?.[0]?.message?.content;
    if(typeof answer!=="string")throw Error("Resposta da IA incompleta.");
    const parsed=JSON.parse(answer) as {sentences?:{id:string;sentence:string}[]};
    if(!Array.isArray(parsed.sentences))throw Error("Formato das frases inválido.");
    const byId=new Map(parsed.sentences.map(x=>[x.id,x.sentence]));
    const payload=pending.flatMap(w=>{
      const sentence=byId.get(w.id);
      if(typeof sentence!=="string"||sentence.length>600||sentence.length<5||!includesWord(sentence,w.word))return [];
      return [{user_id:auth.user.id,vocab_id:w.id,phrase_en:sentence.trim(),source:"ai",updated_at:new Date().toISOString()}];
    });
    if(!payload.length)throw Error("A IA não retornou frases válidas contendo as palavras solicitadas.");
    const save=await db.from("mt_english_favorite_phrases").upsert(payload,{onConflict:"user_id,vocab_id"});
    if(save.error)throw save.error;
    return NextResponse.json({ok:true,generated:payload.length},{headers:{"Cache-Control":"no-store"}});
  }catch(e){
    return NextResponse.json({error:e instanceof Error?e.message:"Falha ao gerar frases."},{status:500});
  }
}
