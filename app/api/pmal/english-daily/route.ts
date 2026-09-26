import { NextResponse } from "next/server";
import { loadPmalEnglishDailyTasks } from "@/lib/pmal-english-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const tasks = await loadPmalEnglishDailyTasks(null);

    return NextResponse.json(
      {
        ok: true,
        count: tasks.length,
        tasks,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        count: 0,
        tasks: [],
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível carregar as leituras diárias.",
      },
      { status: 500 },
    );
  }
}
