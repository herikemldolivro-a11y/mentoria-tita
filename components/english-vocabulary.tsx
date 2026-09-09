"use client";

import { ArrowLeft, Search, Sparkles, Star } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { EnglishVocabularyWord } from "@/lib/english-types";
import { createClient } from "@/lib/supabase/client";

export function EnglishVocabulary() {
  const [words, setWords] = useState<EnglishVocabularyWord[]>([]);
  const [query, setQuery] = useState("");
  const [starredOnly, setStarredOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase.rpc("get_my_english_vocabulary");
        if (error) throw error;
        setWords((data ?? []) as EnglishVocabularyWord[]);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Não foi possível carregar o vocabulário.");
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, []);

  async function toggleStar(word: EnglishVocabularyWord) {
    const supabase = createClient();
    const next = !word.starred;
    const { error } = await supabase.rpc("set_english_vocab_star", { p_vocab_id: word.id, p_starred: next });
    if (error) { setErrorMessage(error.message); return; }
    setWords((current) => current.map((item) => item.id === word.id ? { ...item, starred: next } : item));
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return words.filter((word) => {
      if (starredOnly && !word.starred) return false;
      if (!q) return true;
      return word.word.toLowerCase().includes(q) || word.translation.toLowerCase().includes(q) || (word.text_title ?? "").toLowerCase().includes(q);
    });
  }, [query, starredOnly, words]);

  return (
    <div className="mx-auto w-full max-w-[1080px] px-4 pb-20 pt-6 sm:px-6 sm:pt-8">
      <Link href="/ingles" className="inline-flex min-h-10 items-center gap-2 text-[9px] font-black text-[var(--muted)]"><ArrowLeft size={15} /> ENGLISH READING LAB</Link>

      <section className="mt-3 rounded-[28px] border border-[#d2a64e]/25 bg-[#090a0c] p-6 text-white sm:p-8">
        <span className="inline-flex items-center gap-2 text-[9px] font-black tracking-[.18em] text-[#e4b960]"><Sparkles size={15} /> VOCABULÁRIO PESSOAL</span>
        <h1 className="mt-3 font-serif text-4xl tracking-[-.04em]">Tudo que você clicou fica aqui.</h1>
        <p className="mt-3 max-w-2xl text-xs leading-6 text-white/50">Mais recentes primeiro. Use a estrela para destacar as palavras mais importantes.</p>
      </section>

      <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]">
        <label className="flex min-h-12 items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4">
          <Search size={15} className="text-[var(--muted)]" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar palavra, tradução ou texto..." className="w-full bg-transparent text-sm text-[var(--ink)] outline-none" />
        </label>
        <button type="button" onClick={() => setStarredOnly((value) => !value)} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border px-4 text-[9px] font-black" style={{ borderColor: starredOnly ? "rgba(210,166,78,.5)" : "var(--border)", background: starredOnly ? "rgba(210,166,78,.08)" : "var(--surface)", color: starredOnly ? "var(--gold-bright)" : "var(--muted)" }}>
          <Star size={14} fill={starredOnly ? "currentColor" : "none"} /> SOMENTE DESTAQUES
        </button>
      </div>

      {errorMessage ? <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-400">{errorMessage}</div> : null}

      {loading ? (
        <div className="mt-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 text-sm text-[var(--muted)]">Carregando vocabulário...</div>
      ) : filtered.length ? (
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {filtered.map((word) => (
            <article key={word.id} className="rounded-[22px] border border-[var(--border)] bg-[var(--surface)] p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <strong className="block font-serif text-3xl text-[var(--ink)]">{word.word}</strong>
                  <span className="mt-1 block text-sm font-semibold text-[var(--gold-bright)]">{word.translation}</span>
                </div>
                <button type="button" onClick={() => void toggleStar(word)} className="grid h-10 w-10 place-items-center rounded-xl border border-[var(--border)] text-[var(--gold-bright)]">
                  <Star size={16} fill={word.starred ? "currentColor" : "none"} />
                </button>
              </div>
              {word.context ? <p className="mt-4 text-[10px] leading-5 text-[var(--muted)]">{word.context}</p> : null}
              <div className="mt-4 border-t border-[var(--border)] pt-3 text-[8px] font-bold text-[var(--muted)]">
                <span className="block">{word.text_title ?? "Texto"} · Semana {word.week_number ?? "—"} · Dia {word.day_number ?? "—"}</span>
                <span className="mt-1 block">Revisada {word.review_count}x · salva em {new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(word.saved_at))}</span>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-5 rounded-2xl border border-dashed border-[var(--border-strong)] bg-[var(--surface)] p-9 text-center">
          <Star className="mx-auto text-[var(--gold-bright)]" size={22} />
          <strong className="mt-3 block font-serif text-2xl text-[var(--ink)]">Nenhuma palavra aqui ainda.</strong>
          <p className="mt-2 text-xs text-[var(--muted)]">Hover não salva. A palavra só entra aqui quando você clica nela.</p>
        </div>
      )}
    </div>
  );
}
