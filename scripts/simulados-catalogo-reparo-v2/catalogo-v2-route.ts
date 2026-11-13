// MT_SIMULADOS_CATALOGO_RECOVERY_V2
// Only the catalog is served here. The existing PDF, corrections, and review APIs remain untouched.
import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CatalogQuestion = { numero: number; pagina: number; gabarito: string };
type CatalogEntry = {
  id: string; dia: number; titulo: string; origem?: string; total: number;
  arquivos: Record<string,string>; questoes: CatalogQuestion[];
};
const noCache = { "Cache-Control": "private, no-store, max-age=0" };

export async function GET() {
  try {
    const supabase = await createClient();
    const { data, error: authError } = await supabase.auth.getUser();
    if (authError || !data.user) {
      return NextResponse.json({ error: "Faça login na TITÃ para visualizar o catálogo." }, {
        status: 401, headers: noCache
      });
    }

    const file = path.join(process.cwd(), "private", "simulados-pmal", "manifest.json");
    let jsonText: string;
    try {
      jsonText = await readFile(file, "utf8");
    } catch {
      console.error("[TITÃ CATALOGO V2] manifest.json não encontrado em private/simulados-pmal");
      return NextResponse.json({
        error: "Arquivo private/simulados-pmal/manifest.json não encontrado. Verifique a instalação dos simulados."
      }, {status: 500, headers: noCache});
    }

    let parsed: unknown;
    try { parsed = JSON.parse(jsonText); }
    catch {
      console.error("[TITÃ CATALOGO V2] JSON do manifesto inválido");
      return NextResponse.json({error: "O manifest.json não é um JSON válido."}, {
        status: 500, headers: noCache
      });
    }

    // Support both the legacy root array and the newer { simulados: [] } shape.
    const entries: unknown = Array.isArray(parsed) ? parsed :
      parsed && typeof parsed === "object" && "simulados" in parsed
        ? (parsed as {simulados: unknown}).simulados : null;
    if (!Array.isArray(entries) || !entries.length) {
      return NextResponse.json({error: "Formato do catálogo inválido: lista de simulados ausente."}, {
        status: 500, headers: noCache
      });
    }

    const seen = new Set<string>();
    for (let index=0;index<entries.length;index++) {
      const x=entries[index] as Partial<CatalogEntry> | null;
      if (!x || typeof x!=="object" ||
        typeof x.id!=="string" || !x.id ||
        typeof x.dia!=="number" || !Number.isInteger(x.dia) ||
        typeof x.titulo!=="string" ||
        !Array.isArray(x.questoes) || !x.questoes.length ||
        typeof x.total!=="number" || !Number.isInteger(x.total) ||
        !x.arquivos || typeof x.arquivos!=="object") {
        return NextResponse.json({
          error: "Registro de simulado inválido na posição "+(index+1)+". Nenhum dado foi alterado."
        },{status:500,headers:noCache});
      }
      if (seen.has(x.id)) {
        return NextResponse.json({error:"ID duplicado no catálogo: "+x.id}, {
          status:500,headers:noCache
        });
      }
      seen.add(x.id);
    }

    return NextResponse.json({simulados:entries}, {headers:noCache});
  } catch (error) {
    console.error("[TITÃ CATALOGO V2] Falha no leitor de simulados:",error);
    return NextResponse.json({error:"Erro interno ao ler catálogo. Consulte o terminal npm run dev."}, {
      status:500,headers:noCache
    });
  }
}
