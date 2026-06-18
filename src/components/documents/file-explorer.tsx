"use client";

import { useActionState, useState, useRef, useTransition } from "react";
import {
  Folder,
  FolderOpen,
  FolderPlus,
  ChevronRight,
  ChevronDown,
  FileText,
  FileImage,
  FileSpreadsheet,
  File,
  Upload,
  Trash2,
  Download,
  Pencil,
  Check,
  X,
  Move,
} from "lucide-react";
import {
  createDossier,
  uploadDocument,
  deleteDocument,
  renameDocument,
  moveDocument,
  deleteDossier,
  renameDossier,
} from "@/lib/actions/documents";
import { formatDate } from "@/lib/format";
import type { DossierState, DocumentState } from "@/lib/actions/documents";

// ─── Types ────────────────────────────────────────────────────────────────────

export type DossierNode = {
  id: string;
  nom: string;
  systeme: boolean;
  parentId: string | null;
  ordre: number;
  enfants: DossierNode[];
};

export type DocumentRow = {
  id: string;
  nom: string;
  type: string;
  chemin: string;
  taille: number;
  description: string | null;
  dossierId: string | null;
  createdAt: Date;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / 1024 / 1024).toFixed(1)} Mo`;
}

function FileIcon({ type }: { type: string }) {
  if (type.startsWith("image/")) return <FileImage className="h-5 w-5 text-green-500" />;
  if (type.includes("pdf")) return <FileText className="h-5 w-5 text-red-500" />;
  if (type.includes("spreadsheet") || type.includes("excel") || type.includes("csv"))
    return <FileSpreadsheet className="h-5 w-5 text-emerald-600" />;
  if (type.includes("word") || type.includes("document"))
    return <FileText className="h-5 w-5 text-brand-blue" />;
  return <File className="h-5 w-5 text-slate-400" />;
}

// ─── Arbre des dossiers ───────────────────────────────────────────────────────

function DossierItem({
  node,
  selectedId,
  onSelect,
  depth,
}: {
  node: DossierNode;
  selectedId: string | null;
  onSelect: (id: string) => void;
  depth: number;
}) {
  const [open, setOpen] = useState(depth === 0);
  const [renaming, setRenaming] = useState(false);
  const [newNom, setNewNom] = useState(node.nom);
  const [, startTransition] = useTransition();
  const isSelected = selectedId === node.id;

  function handleRename() {
    if (newNom.trim() && newNom !== node.nom) {
      startTransition(async () => {
        await renameDossier(node.id, newNom);
      });
    }
    setRenaming(false);
  }

  return (
    <div>
      <div
        className={`group flex items-center gap-1 rounded-lg px-2 py-1.5 cursor-pointer text-sm transition ${
          isSelected
            ? "bg-brand-blue/10 text-brand-blue-dark font-medium"
            : "text-slate-600 hover:bg-slate-100"
        }`}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={() => { onSelect(node.id); setOpen(true); }}
      >
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
          className="shrink-0 p-0.5"
        >
          {node.enfants.length > 0 ? (
            open ? <ChevronDown className="h-3.5 w-3.5 text-slate-400" /> : <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
          ) : (
            <span className="h-3.5 w-3.5 block" />
          )}
        </button>
        {open && node.enfants.length > 0 ? (
          <FolderOpen className="h-4 w-4 shrink-0 text-brand-orange" />
        ) : (
          <Folder className={`h-4 w-4 shrink-0 ${isSelected ? "text-brand-orange" : "text-slate-400"}`} />
        )}

        {renaming ? (
          <input
            type="text"
            value={newNom}
            onChange={(e) => setNewNom(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => { if (e.key === "Enter") handleRename(); if (e.key === "Escape") setRenaming(false); }}
            className="ml-1 flex-1 rounded border border-brand-blue px-1 text-sm outline-none"
            autoFocus
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="ml-1 flex-1 truncate">{node.nom}</span>
        )}

        {!node.systeme && !renaming && (
          <div className="ml-auto hidden shrink-0 items-center gap-0.5 group-hover:flex">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setRenaming(true); }}
              className="rounded p-0.5 text-slate-400 hover:text-brand-blue"
              title="Renommer"
            >
              <Pencil className="h-3 w-3" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (confirm(`Supprimer le dossier "${node.nom}" et tous ses fichiers ?`)) {
                  startTransition(async () => { await deleteDossier(node.id); });
                }
              }}
              className="rounded p-0.5 text-slate-400 hover:text-red-500"
              title="Supprimer"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>
      {open && node.enfants.length > 0 && (
        <div>
          {node.enfants.map((child) => (
            <DossierItem
              key={child.id}
              node={child}
              selectedId={selectedId}
              onSelect={onSelect}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Upload dropzone ─────────────────────────────────────────────────────────

function UploadZone({ dossierId, onUploaded }: { dossierId: string | null; onUploaded: () => void }) {
  const [state, formAction] = useActionState(
    uploadDocument as (p: DocumentState, f: FormData) => Promise<DocumentState>,
    undefined,
  );
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0 && fileRef.current) {
      const dt = new DataTransfer();
      files.forEach((f) => dt.items.add(f));
      fileRef.current.files = dt.files;
      formRef.current?.requestSubmit();
    }
  }

  return (
    <form ref={formRef} action={async (fd) => { await formAction(fd); onUploaded(); }} encType="multipart/form-data">
      <input type="hidden" name="dossierId" value={dossierId ?? ""} />
      <input ref={fileRef} type="file" name="fichier" multiple className="sr-only" onChange={() => formRef.current?.requestSubmit()} />
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
        className={`cursor-pointer rounded-xl border-2 border-dashed px-6 py-4 text-center transition ${
          dragging
            ? "border-brand-blue bg-brand-blue/5 text-brand-blue"
            : "border-slate-200 text-slate-400 hover:border-brand-blue/40 hover:text-brand-blue"
        }`}
      >
        <Upload className="mx-auto mb-1 h-5 w-5" />
        <p className="text-sm font-medium">Déposer des fichiers ici ou cliquer pour importer</p>
        <p className="text-xs">PDF, Word, Excel, Images…</p>
      </div>
      {state?.errors?.fichier && (
        <p className="mt-1 text-xs text-red-500">{state.errors.fichier[0]}</p>
      )}
    </form>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────

export function FileExplorer({
  dossiers,
  documents,
  allDossiers,
  selectedDossierId,
}: {
  dossiers: DossierNode[];
  documents: DocumentRow[];
  allDossiers: { id: string; nom: string; parentId: string | null }[];
  selectedDossierId: string | null;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(selectedDossierId);
  const [createState, createAction] = useActionState(createDossier, undefined);
  const [renamingDocId, setRenamingDocId] = useState<string | null>(null);
  const [newDocNom, setNewDocNom] = useState("");
  const [movingDocId, setMovingDocId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [tick, setTick] = useState(0); // force refresh after upload

  const currentDocs = documents.filter((d) => d.dossierId === selectedId);

  const selectedDossierLabel = allDossiers.find((d) => d.id === selectedId)?.nom ?? "Tous les documents";

  function handleDelete(id: string, nom: string) {
    if (confirm(`Supprimer le fichier "${nom}" ?`)) {
      startTransition(async () => { await deleteDocument(id); setTick((t) => t + 1); });
    }
  }

  function handleRename(id: string) {
    startTransition(async () => {
      await renameDocument(id, newDocNom);
      setRenamingDocId(null);
    });
  }

  function handleMove(docId: string, targetId: string | null) {
    startTransition(async () => {
      await moveDocument(docId, targetId);
      setMovingDocId(null);
      setTick((t) => t + 1);
    });
  }

  return (
    <div className="flex gap-0 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden" style={{ minHeight: "70vh" }}>
      {/* Sidebar dossiers */}
      <aside className="w-72 shrink-0 border-r border-slate-100 bg-slate-50 flex flex-col">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Dossiers</h3>
          <form action={createAction}>
            <input type="hidden" name="parentId" value={selectedId ?? ""} />
            <input
              name="nom"
              type="text"
              placeholder="Nouveau dossier…"
              className="mr-1 w-36 rounded-md border border-slate-200 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-brand-blue"
              onKeyDown={(e) => {
                if (e.key === "Enter") (e.target as HTMLInputElement).closest("form")?.requestSubmit();
              }}
            />
            <button type="submit" title="Créer" className="rounded-md p-1 text-slate-400 hover:text-brand-blue">
              <FolderPlus className="h-4 w-4" />
            </button>
          </form>
        </div>

        {/* "Tous les fichiers" */}
        <div
          onClick={() => setSelectedId(null)}
          className={`mx-2 mt-2 flex cursor-pointer items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition ${
            selectedId === null
              ? "bg-brand-blue/10 font-medium text-brand-blue-dark"
              : "text-slate-500 hover:bg-slate-100"
          }`}
        >
          <Folder className="h-4 w-4 text-slate-400" />
          <span>Tous les fichiers</span>
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          {dossiers.map((node) => (
            <DossierItem
              key={node.id}
              node={node}
              selectedId={selectedId}
              onSelect={setSelectedId}
              depth={0}
            />
          ))}
        </div>
      </aside>

      {/* Panneau principal */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <div>
            <h3 className="font-semibold text-brand-navy">{selectedDossierLabel}</h3>
            <p className="text-xs text-slate-400">
              {currentDocs.length} fichier{currentDocs.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {/* Upload */}
        <div className="border-b border-slate-100 px-5 py-3">
          <UploadZone dossierId={selectedId} onUploaded={() => setTick((t) => t + 1)} />
        </div>

        {/* Liste de fichiers */}
        <div className="flex-1 overflow-y-auto">
          {currentDocs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-300">
              <Folder className="mb-3 h-12 w-12" />
              <p className="text-sm">Aucun fichier dans ce dossier</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-5 py-2">Nom</th>
                  <th className="px-5 py-2">Taille</th>
                  <th className="px-5 py-2">Date</th>
                  <th className="px-5 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {currentDocs.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50 group">
                    <td className="px-5 py-2">
                      <div className="flex items-center gap-2">
                        <FileIcon type={doc.type} />
                        {renamingDocId === doc.id ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              value={newDocNom}
                              onChange={(e) => setNewDocNom(e.target.value)}
                              onKeyDown={(e) => { if (e.key === "Enter") handleRename(doc.id); if (e.key === "Escape") setRenamingDocId(null); }}
                              className="rounded border border-brand-blue px-2 py-0.5 text-sm outline-none"
                              autoFocus
                            />
                            <button type="button" onClick={() => handleRename(doc.id)} className="text-green-500 hover:text-green-600">
                              <Check className="h-4 w-4" />
                            </button>
                            <button type="button" onClick={() => setRenamingDocId(null)} className="text-slate-400 hover:text-slate-600">
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <span className="font-medium text-slate-700">{doc.nom}</span>
                        )}
                      </div>
                      {doc.description && <p className="ml-7 text-xs text-slate-400">{doc.description}</p>}
                    </td>
                    <td className="px-5 py-2 text-slate-400 text-xs">{formatSize(doc.taille)}</td>
                    <td className="px-5 py-2 text-slate-400 text-xs">{formatDate(doc.createdAt)}</td>
                    <td className="px-5 py-2">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition">
                        <a
                          href={doc.chemin}
                          download={doc.nom}
                          className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-brand-blue"
                          title="Télécharger"
                        >
                          <Download className="h-4 w-4" />
                        </a>
                        <button
                          type="button"
                          onClick={() => { setRenamingDocId(doc.id); setNewDocNom(doc.nom); }}
                          className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-brand-blue"
                          title="Renommer"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setMovingDocId(doc.id)}
                          className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-brand-navy"
                          title="Déplacer"
                        >
                          <Move className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(doc.id, doc.nom)}
                          className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500"
                          title="Supprimer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal déplacer */}
      {movingDocId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold text-brand-navy">Déplacer vers…</h3>
              <button type="button" onClick={() => setMovingDocId(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="max-h-64 overflow-y-auto rounded-lg border border-slate-100">
              <button
                type="button"
                onClick={() => handleMove(movingDocId, null)}
                className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 border-b border-slate-50"
              >
                — Racine (tous les fichiers)
              </button>
              {allDossiers.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => handleMove(movingDocId, d.id)}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-brand-blue/5"
                >
                  📁 {d.nom}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
