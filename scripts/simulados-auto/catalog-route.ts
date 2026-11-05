import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { requireAuthenticatedUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAuthenticatedUser();
    const filename = path.join(process.cwd(),"private","simulados-pmal","manifest.json");
    const content = await readFile(filename,"utf8");
    const parsed: unknown = JSON.parse(content);
    const simulados = Array.isArray(parsed)
      ? parsed
      : parsed && typeof parsed === "object" && "simulados" in parsed
        ? (parsed as { simulados: unknown }).simulados
        : null;
    if (!Array.isArray(simulados) || simulados.length !== 13) {
      return NextResponse.json({error:"Catálogo de simulados inválido."},{status:500});
    }
    return NextResponse.json({ simulados },{headers:{"Cache-Control":"no-store"}});
  } catch {
    return NextResponse.json({error:"Não foi possível acessar os simulados."},{status:401});
  }
}
