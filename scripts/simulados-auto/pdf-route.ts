import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { requireAuthenticatedUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{arquivo:string}> }) {
  try {
    await requireAuthenticatedUser();
    const {arquivo} = await context.params;
    if (!/^dia-0[1-7]-(geral|mini)-(prova|comentado|gabarito)\.pdf$/.test(arquivo)) {
      return NextResponse.json({error:"Arquivo inválido"},{status:400});
    }
    const src = path.join(process.cwd(),"private","simulados-pmal","pdfs",arquivo);
    const pdf = await readFile(src);
    return new Response(new Uint8Array(pdf),{headers:{"Content-Type":"application/pdf","Content-Disposition":"inline; filename=\""+arquivo+"\"","Cache-Control":"private, max-age=300","X-Content-Type-Options":"nosniff"}});
  } catch {
    return NextResponse.json({error:"PDF não encontrado ou acesso negado."},{status:404});
  }
}
