"use client";

import {
  Download,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  createLessonMaterialSignedUrl,
  downloadLessonMaterial,
  loadActiveLessonMaterial,
  type LessonMaterial,
} from "@/lib/lesson-materials";

export function LessonMaterialReader({
  subjectSlug,
  lessonSlug,
  lessonTitle,
}: {
  subjectSlug: string;
  lessonSlug: string;
  lessonTitle: string;
}) {
  const [material, setMaterial] = useState<LessonMaterial | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const nextMaterial = await loadActiveLessonMaterial(subjectSlug, lessonSlug);
      setMaterial(nextMaterial);
      if (nextMaterial) {
        setSignedUrl(await createLessonMaterialSignedUrl(nextMaterial.storage_path));
      } else {
        setSignedUrl(null);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Não foi possível abrir o material.");
    } finally {
      setLoading(false);
    }
  }, [subjectSlug, lessonSlug]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function handleDownload() {
    if (!material || !material.allow_download) return;
    setDownloading(true);
    setErrorMessage(null);
    try {
      await downloadLessonMaterial(material);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Não foi possível baixar o material.");
    } finally {
      setDownloading(false);
    }
  }

  if (loading) {
    return (
      <div className="mt-5 grid min-h-[360px] place-items-center rounded-2xl border border-[var(--border-strong)] bg-[#090a0c] text-white">
        <div className="text-center">
          <LoaderCircle className="mx-auto animate-spin text-[#d9ab50]" size={30} />
          <span className="mt-3 block text-[10px] font-black tracking-[.14em] text-white/45">CARREGANDO MATERIAL</span>
        </div>
      </div>
    );
  }

  if (!material || !signedUrl) {
    return (
      <div className="mt-5 overflow-hidden rounded-2xl border border-[var(--border-strong)] bg-[#090a0c] text-white">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div>
            <span className="text-[9px] font-black tracking-[.15em] text-[#d9ab50]">MATERIAL DA PLATAFORMA</span>
            <strong className="mt-1 block text-sm">{lessonTitle}</strong>
          </div>
          <FileText size={20} className="text-[#d9ab50]" />
        </div>
        <div className="grid min-h-[330px] place-items-center p-6 text-center">
          <div className="max-w-md">
            <FileText className="mx-auto text-[#d9ab50]" size={38} />
            <strong className="mt-4 block font-serif text-2xl">Material ainda não publicado</strong>
            <p className="mt-3 text-xs leading-6 text-white/48">Assim que o administrador enviar o PDF desta aula, ele aparecerá aqui automaticamente.</p>
            <button type="button" onClick={() => void load()} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/10 px-4 text-[10px] font-black tracking-[.1em] text-white/65 transition hover:border-[#d9ab50]/40 hover:text-[#e5bd6d]"><RefreshCw size={14} /> TENTAR NOVAMENTE</button>
          </div>
        </div>
      </div>
    );
  }

  const isPdf = material.mime_type === "application/pdf";
  const isImage = material.mime_type.startsWith("image/");

  return (
    <div className="mt-5 overflow-hidden rounded-2xl border border-[var(--border-strong)] bg-[#090a0c] text-white shadow-[0_18px_60px_rgba(0,0,0,.25)]">
      <div className="flex flex-col gap-3 border-b border-white/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-2 text-[9px] font-black tracking-[.15em] text-[#d9ab50]"><ShieldCheck size={13} /> LEITOR DA MENTORIA TITÃ</span>
          <strong className="mt-1 block truncate text-sm">{material.title || lessonTitle}</strong>
          <span className="mt-1 block truncate text-[9px] text-white/35">Versão {material.version} · {material.file_name}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={signedUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/10 px-3 text-[9px] font-black tracking-[.08em] text-white/65 transition hover:border-[#d9ab50]/40 hover:text-[#e5bd6d]"><ExternalLink size={14} /> ABRIR EM NOVA ABA</a>
          {material.allow_download ? (
            <button type="button" disabled={downloading} onClick={() => void handleDownload()} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#d7aa50] px-3.5 text-[9px] font-black tracking-[.08em] text-[#111] transition hover:bg-[#e5bd6d] disabled:cursor-wait disabled:opacity-60">{downloading ? <LoaderCircle className="animate-spin" size={14} /> : <Download size={14} />} {downloading ? "BAIXANDO..." : "BAIXAR PDF"}</button>
          ) : null}
        </div>
      </div>

      {isPdf ? (
        <iframe
          src={`${signedUrl}#toolbar=1&navpanes=0&view=FitH`}
          title={`PDF - ${material.title}`}
          className="block h-[72vh] min-h-[560px] w-full bg-white"
        />
      ) : isImage ? (
        <div className="grid min-h-[560px] place-items-center bg-[#111318] p-4 sm:p-7">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={signedUrl} alt={material.title} className="max-h-[78vh] max-w-full rounded-xl object-contain shadow-2xl" />
        </div>
      ) : (
        <div className="grid min-h-[420px] place-items-center p-6 text-center">
          <div>
            <ImageIcon className="mx-auto text-[#d9ab50]" size={36} />
            <strong className="mt-4 block font-serif text-2xl">Formato não visualizável no navegador</strong>
            <p className="mt-2 text-xs text-white/50">Use o botão de download para abrir este material.</p>
          </div>
        </div>
      )}

      {errorMessage ? <div className="border-t border-red-500/20 bg-red-500/10 px-4 py-3 text-xs text-red-200">{errorMessage}</div> : null}
    </div>
  );
}
