"use client";

import {
  Check,
  Download,
  FileText,
  LoaderCircle,
  RefreshCw,
  Replace,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { ChangeEvent, DragEvent, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { LESSON_MATERIALS_BUCKET } from "@/lib/lesson-materials";

export type AdminLesson = {
  plan_id: string;
  plan_slug: string;
  week_id: string;
  week_number: number;
  subject_id: string;
  subject_slug: string;
  subject_short_name: string;
  subject_name: string;
  lesson_id: string;
  lesson_slug: string;
  lesson_title: string;
  lesson_position: number;
};

export type AdminMaterial = {
  id: string;
  lesson_id: string;
  title: string;
  file_name: string;
  storage_path: string;
  mime_type: string;
  file_size: number;
  version: number;
  is_active: boolean;
  allow_download: boolean;
  created_at: string;
};

function safeSegment(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9.-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function formatBytes(value: number) {
  if (!value) return "0 KB";
  const mb = value / 1024 / 1024;
  return mb >= 1 ? `${mb.toFixed(mb >= 10 ? 0 : 1)} MB` : `${Math.max(1, Math.round(value / 1024))} KB`;
}

export function AdminContentManager({
  lessons,
  initialMaterials,
}: {
  lessons: AdminLesson[];
  initialMaterials: AdminMaterial[];
}) {
  const [selectedLessonId, setSelectedLessonId] = useState(lessons[0]?.lesson_id ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState(lessons[0]?.lesson_title ?? "");
  const [allowDownload, setAllowDownload] = useState(true);
  const [materials, setMaterials] = useState(initialMaterials);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const selectedLesson = useMemo(
    () => lessons.find((lesson) => lesson.lesson_id === selectedLessonId) ?? null,
    [lessons, selectedLessonId],
  );

  const activeMaterial = useMemo(
    () => materials.find((material) => material.lesson_id === selectedLessonId && material.is_active) ?? null,
    [materials, selectedLessonId],
  );

  function chooseLesson(nextId: string) {
    const next = lessons.find((lesson) => lesson.lesson_id === nextId);
    setSelectedLessonId(nextId);
    setTitle(next?.lesson_title ?? "");
    setFile(null);
    setMessage(null);
    setErrorMessage(null);
    const existing = materials.find((material) => material.lesson_id === nextId && material.is_active);
    setAllowDownload(existing?.allow_download ?? true);
  }

  function validateFile(nextFile: File) {
    const accepted = ["application/pdf", "image/png", "image/jpeg", "image/webp"];
    if (!accepted.includes(nextFile.type)) {
      setErrorMessage("Envie PDF, PNG, JPG ou WEBP.");
      return false;
    }
    if (nextFile.size > 100 * 1024 * 1024) {
      setErrorMessage("O arquivo ultrapassa o limite de 100 MB.");
      return false;
    }
    setErrorMessage(null);
    return true;
  }

  function handleFile(nextFile: File | null) {
    if (!nextFile) return;
    if (validateFile(nextFile)) setFile(nextFile);
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    handleFile(event.dataTransfer.files?.[0] ?? null);
  }

  async function refreshMaterials() {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("lesson_materials")
      .select("id,lesson_id,title,file_name,storage_path,mime_type,file_size,version,is_active,allow_download,created_at")
      .order("created_at", { ascending: false });
    if (error) throw error;
    setMaterials((data ?? []) as AdminMaterial[]);
  }

  async function upload() {
    if (!selectedLesson || !file || uploading) return;
    setUploading(true);
    setMessage(null);
    setErrorMessage(null);
    const supabase = createClient();

    const timestamp = Date.now();
    const extension = file.name.includes(".") ? file.name.split(".").pop() : "pdf";
    const storagePath = `${safeSegment(selectedLesson.plan_slug)}/semana-${selectedLesson.week_number}/${safeSegment(selectedLesson.subject_slug)}/${safeSegment(selectedLesson.lesson_slug)}/${timestamp}-${safeSegment(file.name.replace(/\.[^.]+$/, ""))}.${safeSegment(extension ?? "pdf")}`;

    try {
      const { error: uploadError } = await supabase.storage
        .from(LESSON_MATERIALS_BUCKET)
        .upload(storagePath, file, {
          cacheControl: "3600",
          contentType: file.type,
          upsert: false,
        });
      if (uploadError) throw uploadError;

      const { error: publishError } = await supabase.rpc("publish_lesson_material", {
        p_lesson_id: selectedLesson.lesson_id,
        p_title: title.trim() || selectedLesson.lesson_title,
        p_file_name: file.name,
        p_storage_path: storagePath,
        p_mime_type: file.type,
        p_file_size: file.size,
        p_allow_download: allowDownload,
      });

      if (publishError) {
        await supabase.storage.from(LESSON_MATERIALS_BUCKET).remove([storagePath]);
        throw publishError;
      }

      await refreshMaterials();
      setFile(null);
      setMessage(activeMaterial ? "Nova versão publicada. A aula já usa o arquivo novo." : "Material publicado. Ele já está disponível para o aluno.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Não foi possível publicar o material.");
    } finally {
      setUploading(false);
    }
  }

  async function removeCurrent() {
    if (!activeMaterial || !confirm("Remover o material ativo desta aula?")) return;
    setUploading(true);
    setMessage(null);
    setErrorMessage(null);
    const supabase = createClient();
    try {
      const { error: storageError } = await supabase.storage
        .from(LESSON_MATERIALS_BUCKET)
        .remove([activeMaterial.storage_path]);
      if (storageError) throw storageError;

      const { error: rowError } = await supabase
        .from("lesson_materials")
        .delete()
        .eq("id", activeMaterial.id);
      if (rowError) throw rowError;

      await refreshMaterials();
      setMessage("Material removido da aula.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Não foi possível remover o material.");
    } finally {
      setUploading(false);
    }
  }

  async function downloadCurrent() {
    if (!activeMaterial) return;
    const supabase = createClient();
    const { data, error } = await supabase.storage
      .from(LESSON_MATERIALS_BUCKET)
      .download(activeMaterial.storage_path);
    if (error) {
      setErrorMessage(error.message);
      return;
    }
    const url = URL.createObjectURL(data);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = activeMaterial.file_name;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <aside className="rounded-[26px] border border-[var(--border)] bg-[var(--surface)] p-5 lg:sticky lg:top-28 lg:self-start">
        <span className="text-[9px] font-black tracking-[.18em] text-[var(--gold-bright)]">DESTINO DO MATERIAL</span>
        <h2 className="mt-2 font-serif text-2xl text-[var(--ink)]">Escolha a aula.</h2>
        <p className="mt-2 text-xs leading-6 text-[var(--muted)]">Você só seleciona concurso/semana/matéria/aula e envia o arquivo. Não precisa alterar código.</p>

        <label className="mt-5 block text-[10px] font-black tracking-[.12em] text-[var(--muted)]">
          AULA
          <select value={selectedLessonId} onChange={(event) => chooseLesson(event.target.value)} className="mt-2 min-h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm font-semibold text-[var(--ink)] outline-none focus:border-[var(--border-strong)]">
            {lessons.map((lesson) => (
              <option key={lesson.lesson_id} value={lesson.lesson_id}>
                PRF · S{lesson.week_number} · {lesson.subject_short_name} · {lesson.lesson_position}. {lesson.lesson_title}
              </option>
            ))}
          </select>
        </label>

        {selectedLesson ? (
          <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4">
            <span className="text-[9px] font-black tracking-[.13em] text-[var(--gold-bright)]">SELECIONADO</span>
            <strong className="mt-1 block font-serif text-lg text-[var(--ink)]">{selectedLesson.lesson_title}</strong>
            <span className="mt-1 block text-[10px] text-[var(--muted)]">{selectedLesson.subject_name} · Semana {selectedLesson.week_number}</span>
          </div>
        ) : null}
      </aside>

      <div className="space-y-5">
        <section className="rounded-[26px] border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-7">
          <span className="text-[9px] font-black tracking-[.18em] text-[var(--gold-bright)]">MATERIAL ATUAL</span>
          {activeMaterial ? (
            <div className="mt-4 flex flex-col gap-4 rounded-2xl border border-emerald-500/25 bg-emerald-500/[.04] p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-emerald-500/25 bg-emerald-500/10 text-emerald-400"><FileText size={21} /></span>
                <div className="min-w-0">
                  <span className="inline-flex items-center gap-1.5 text-[9px] font-black tracking-[.12em] text-emerald-400"><Check size={13} /> PUBLICADO · V{activeMaterial.version}</span>
                  <strong className="mt-1 block truncate text-sm text-[var(--ink)]">{activeMaterial.title}</strong>
                  <span className="mt-1 block truncate text-[10px] text-[var(--muted)]">{activeMaterial.file_name} · {formatBytes(activeMaterial.file_size)} · download {activeMaterial.allow_download ? "liberado" : "bloqueado"}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => void downloadCurrent()} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--border)] px-3 text-[9px] font-black text-[var(--muted)] hover:border-[var(--border-strong)] hover:text-[var(--gold-bright)]"><Download size={14} /> BAIXAR</button>
                <button type="button" disabled={uploading} onClick={() => void removeCurrent()} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-red-500/20 px-3 text-[9px] font-black text-red-300 hover:bg-red-500/10"><Trash2 size={14} /> REMOVER</button>
              </div>
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--background)] p-5 text-xs text-[var(--muted)]">Nenhum material publicado nesta aula ainda.</div>
          )}
        </section>

        <section className="rounded-[26px] border border-[var(--border-strong)] bg-[var(--surface)] p-5 sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="text-[9px] font-black tracking-[.18em] text-[var(--gold-bright)]">{activeMaterial ? "SUBSTITUIR MATERIAL" : "PUBLICAR MATERIAL"}</span>
              <h2 className="mt-2 font-serif text-3xl text-[var(--ink)]">Arraste o PDF aqui.</h2>
              <p className="mt-2 text-xs leading-6 text-[var(--muted)]">PDF, PNG, JPG ou WEBP · até 100 MB. Ao publicar, a aula passa a usar o arquivo automaticamente.</p>
            </div>
            {activeMaterial ? <Replace size={22} className="text-[var(--gold-bright)]" /> : <UploadCloud size={24} className="text-[var(--gold-bright)]" />}
          </div>

          <div
            onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={`mt-6 grid min-h-[220px] place-items-center rounded-2xl border-2 border-dashed p-6 text-center transition ${dragging ? "border-[var(--gold-bright)] bg-[color-mix(in_srgb,var(--gold)_10%,transparent)]" : "border-[var(--border)] bg-[var(--background)]"}`}
          >
            <div className="max-w-lg">
              <UploadCloud className="mx-auto text-[var(--gold-bright)]" size={34} />
              <strong className="mt-4 block font-serif text-2xl text-[var(--ink)]">{file ? file.name : "Solte o material da aula"}</strong>
              <span className="mt-2 block text-xs text-[var(--muted)]">{file ? `${formatBytes(file.size)} · ${file.type || "arquivo"}` : "ou selecione o arquivo no computador"}</span>
              <label className="mt-5 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-[var(--border-strong)] bg-[color-mix(in_srgb,var(--gold)_6%,transparent)] px-4 text-[10px] font-black tracking-[.1em] text-[var(--gold-bright)]">
                <FileText size={15} /> SELECIONAR ARQUIVO
                <input type="file" className="hidden" accept="application/pdf,image/png,image/jpeg,image/webp" onChange={(event: ChangeEvent<HTMLInputElement>) => handleFile(event.target.files?.[0] ?? null)} />
              </label>
            </div>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
            <label className="block text-[10px] font-black tracking-[.12em] text-[var(--muted)]">
              TÍTULO EXIBIDO AO ALUNO
              <input value={title} onChange={(event) => setTitle(event.target.value)} className="mt-2 min-h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--ink)] outline-none focus:border-[var(--border-strong)]" />
            </label>
            <label className="flex min-h-12 items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 text-xs font-semibold text-[var(--ink)]">
              <input type="checkbox" checked={allowDownload} onChange={(event) => setAllowDownload(event.target.checked)} className="h-4 w-4 accent-[#d2a64e]" />
              Permitir download pelo aluno
            </label>
          </div>

          {errorMessage ? <div className="mt-4 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-xs text-red-300">{errorMessage}</div> : null}
          {message ? <div className="mt-4 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-300">{message}</div> : null}

          <div className="mt-5 flex flex-wrap gap-3">
            <button type="button" disabled={!file || !selectedLesson || uploading} onClick={() => void upload()} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-[var(--gold)] px-5 text-[10px] font-black tracking-[.1em] text-[#111] transition hover:bg-[var(--gold-bright)] disabled:cursor-not-allowed disabled:opacity-40">{uploading ? <LoaderCircle className="animate-spin" size={16} /> : <UploadCloud size={16} />} {uploading ? "PUBLICANDO..." : activeMaterial ? "PUBLICAR NOVA VERSÃO" : "PUBLICAR MATERIAL"}</button>
            <button type="button" disabled={uploading} onClick={() => void refreshMaterials()} className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-[var(--border)] px-4 text-[10px] font-black tracking-[.1em] text-[var(--muted)] hover:border-[var(--border-strong)] hover:text-[var(--gold-bright)]"><RefreshCw size={15} /> ATUALIZAR</button>
          </div>
        </section>
      </div>
    </div>
  );
}
