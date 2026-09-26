"use client";

import { ArrowLeft, BookMarked, LoaderCircle, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { enemEnglishReadings } from "@/lib/enem-english-data";
import { createClient } from "@/lib/supabase/client";

type SavedWord = {
  reading_id: string;
  word: string;
  word_key: string;
  translation: string;
  context: string;
  saved_at: string;
};

export function EnemEnglishVocabulary() {
  const [userId, setUserId] = useState<string | null>(null);
  const [words, setWords] = useState<SavedWord[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const readingMap = useMemo(() => new Map(enemEnglishReadings.map((reading) => [reading.id, reading])), []);

  useEffect(() => {
    let alive = true;
    const run = async () => {
      try {
        const supabase = createClient();
        const { data: auth, error: authError } = await supabase.auth.getUser();
        if (authError || !auth.user) throw authError ?? new Error("Usuário não autenticado.");
        const { data, error: loadError } = await supabase
          .from("user_enem_english_vocab")
          .select("reading_id,word,word_key,translation,context,saved_at")
          .eq("user_id", auth.user.id)
          .order("saved_at", { ascending: false });
        if (loadError) throw loadError;
        if (!alive) return;
        setUserId(auth.user.id);
        setWords((data ?? []) as SavedWord[]);
      } catch (loadError) {
        if (alive) setError(loadError instanceof Error ? loadError.message : "Não foi possível carregar seu vocabulário.");
      } finally {
        if (alive) setLoading(false);
      }
    };
    void run();
    return () => { alive = false; };
  }, []);

  async function remove(item: SavedWord) {
    if (!userId || busy) return;
    const key = `${item.reading_id}:${item.word_key}`;
    setBusy(key);
    setError(null);
    const supabase = createClient();
    const { error: deleteError } = await supabase
      .from("user_enem_english_vocab")
      .delete()
      .eq("user_id", userId)
      .eq("reading_id", item.reading_id)
      .eq("word_key", item.word_key);
    if (deleteError) setError(deleteError.message);
    else setWords((current) => current.filter((word) => !(word.reading_id === item.reading_id && word.word_key === item.word_key)));
    setBusy(null);
  }

  return (
    <div className="mx-auto w-full max-w-[1050px] px-4 pb-24 pt-7 sm:px-6 sm:pt-10">
      <Link href="/ingles/enem" className="inline-flex min-h-10 items-center gap-2 text-[9px] font-black tracking-[.08em] text-[var(--muted)]"><ArrowLeft size={15}/> VOLTAR AO INGLÊS ENEM</Link>

      <section className="mt-3 overflow-hidden rounded-[30px] border border-emerald-400/15 bg-[radial-gradient(circle_at_85%_0%,rgba(16,185,129,.12),transparent_40%),#08090d] p-6 text-white sm:p-8">
        <span className="inline-flex items-center gap-2 text-[9px] font-black tracking-[.17em] text-emerald-300"><BookMarked size={15}/> CADERNO DE VOCABULÁRIO</span>
        <h1 className="mt-3 font-serif text-4xl tracking-[-.04em] sm:text-5xl">Palavras que você decidiu guardar.</h1>
        <p className="mt-3 max-w-3xl text-xs leading-6 text-white/45">Tudo que você clicar durante as leituras aparece aqui com tradução, contexto e link de volta ao texto em que encontrou a palavra.</p>
        <strong className="mt-5 block font-serif text-3xl text-emerald-200">{words.length} palavras</strong>
      </section>

      {error ? <div className="mt-5 rounded-xl border border-red-500/25 bg-red-500/10 p-4 text-xs text-red-300">{error}</div> : null}
      {loading ? <div className="mt-6 grid min-h-48 place-items-center"><LoaderCircle className="animate-spin text-emerald-400"/></div> : null}

      {!loading && !words.length ? (
        <div className="mt-6 rounded-[24px] border border-dashed border-[var(--border)] bg-[var(--surface)] p-8 text-center text-sm text-[var(--muted)]">Nenhuma palavra salva ainda. Abra uma leitura, passe o mouse para consultar e clique na palavra que quiser guardar.</div>
      ) : null}

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {words.map((item) => {
          const reading = readingMap.get(item.reading_id);
          const rowKey = `${item.reading_id}:${item.word_key}`;
          return (
            <article key={rowKey} className="rounded-[22px] border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <strong className="font-serif text-2xl text-[var(--ink)]">{item.word}</strong>
                  <p className="mt-1 text-xs font-bold text-emerald-500">{item.translation}</p>
                </div>
                <button type="button" disabled={busy === rowKey} onClick={() => void remove(item)} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-red-400/15 text-red-400/65 transition hover:bg-red-400/[.06] disabled:opacity-40" aria-label={`Remover ${item.word}`}><Trash2 size={14}/></button>
              </div>
              <p className="mt-4 line-clamp-3 text-[10px] leading-5 text-[var(--muted)]">{item.context}</p>
              {reading ? <Link href={`/ingles/enem/${reading.id}`} className="mt-4 inline-flex text-[8px] font-black tracking-[.08em] text-violet-500">DIA {reading.day} · {reading.title} →</Link> : null}
            </article>
          );
        })}
      </div>
    </div>
  );
}
