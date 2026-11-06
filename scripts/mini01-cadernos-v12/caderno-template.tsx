"use client";

import type { ReactNode } from "react";
import { useParams } from "next/navigation";
import { NotebookEmptyAutoEditor } from "@/components/notebook-empty-auto-editor";

export default function NotebookTemplate({ children }: { children: ReactNode }) {
  const params = useParams<{ notebookId: string }>();
  const notebookId = params.notebookId;
  return (
    <>
      {children}
      {notebookId ? <NotebookEmptyAutoEditor notebookId={notebookId}/> : null}
    </>
  );
}
