"use client";

import { useEffect, useRef, useState } from "react";
import { useUploadAsset } from "../hooks/use-upload-asset";
import type { AssetType } from "../types";

const TYPE_OPTIONS: { label: string; value: AssetType }[] = [
  { label: "Banner", value: "banner" },
  { label: "Email Template", value: "email" },
  { label: "Social Media", value: "social" },
  { label: "Copy", value: "copy" },
  { label: "Guide", value: "guide" },
];

const MAX_BYTES = 25 * 1024 * 1024;

type Props = {
  open: boolean;
  onClose: () => void;
};

export function UploadAssetModal({ open, onClose }: Props) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState<AssetType>("banner");
  const [file, setFile] = useState<File | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadMutation = useUploadAsset();

  // Reset internal state every time the modal closes — opening it next should
  // start fresh, not show stale title/file from the previous attempt.
  useEffect(() => {
    if (!open) {
      setTitle("");
      setType("banner");
      setFile(null);
      setLocalError(null);
      uploadMutation.reset();
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Close on ESC. Standard modal expectation, basically free to add.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setLocalError(null);
    if (f && f.size > MAX_BYTES) {
      setLocalError(`File is too large (${(f.size / 1024 / 1024).toFixed(1)} MB). Max 25 MB.`);
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    setFile(f);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLocalError(null);

    if (!title.trim()) {
      setLocalError("Title is required");
      return;
    }
    if (!file) {
      setLocalError("Please choose a file");
      return;
    }

    uploadMutation.mutate(
      { title: title.trim(), type, file },
      { onSuccess: () => onClose() },
    );
  }

  if (!open) return null;

  const serverError = uploadMutation.error instanceof Error ? uploadMutation.error.message : null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="upload-asset-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-[var(--space-4)] py-[var(--space-4)]"
      onClick={(e) => {
        // Click outside the panel closes. Don't close if mid-upload.
        if (e.target === e.currentTarget && !uploadMutation.isPending) onClose();
      }}
    >
      <div className="w-full max-w-[28rem] overflow-hidden rounded-[var(--radius)] border border-[rgba(255,255,255,0.10)] bg-[#0E0F11] shadow-[0_30px_80px_rgba(0,0,0,0.55)]">
        <header className="flex items-center justify-between border-b border-[rgba(255,255,255,0.08)] px-[var(--space-5)] py-[var(--space-4)]">
          <h2
            id="upload-asset-title"
            className="font-[var(--font-display)] text-[1.15rem] font-bold tracking-[-0.02em] text-[var(--color-text-primary)]"
          >
            Upload Asset
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={uploadMutation.isPending}
            aria-label="Close"
            className="text-[rgba(255,255,255,0.55)] transition-colors hover:text-[var(--color-text-primary)] disabled:opacity-40"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
              <path d="M4 4l10 10M14 4L4 14" />
            </svg>
          </button>
        </header>

        <form onSubmit={handleSubmit} className="flex flex-col gap-[var(--space-4)] px-[var(--space-5)] py-[var(--space-5)]">
          <div className="flex flex-col gap-[0.4rem]">
            <label
              htmlFor="asset-title"
              className="font-[var(--font-sans)] text-[var(--text-xs)] uppercase tracking-[0.08em] font-semibold text-[rgba(255,255,255,0.50)]"
            >
              Title
            </label>
            <input
              id="asset-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. TOKEN2049 launch banner"
              required
              disabled={uploadMutation.isPending}
              className="rounded-[var(--radius)] border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.04)] px-[var(--space-3)] py-[0.55rem] font-[var(--font-sans)] text-[var(--text-sm)] text-[var(--color-text-primary)] placeholder:text-[rgba(255,255,255,0.30)] focus:border-[rgba(91,141,239,0.50)] focus:outline-none disabled:opacity-50"
            />
          </div>

          <div className="flex flex-col gap-[0.4rem]">
            <label
              htmlFor="asset-type"
              className="font-[var(--font-sans)] text-[var(--text-xs)] uppercase tracking-[0.08em] font-semibold text-[rgba(255,255,255,0.50)]"
            >
              Type
            </label>
            <select
              id="asset-type"
              value={type}
              onChange={(e) => setType(e.target.value as AssetType)}
              disabled={uploadMutation.isPending}
              className="rounded-[var(--radius)] border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.04)] px-[var(--space-3)] py-[0.55rem] font-[var(--font-sans)] text-[var(--text-sm)] text-[var(--color-text-primary)] focus:border-[rgba(91,141,239,0.50)] focus:outline-none disabled:opacity-50"
            >
              {TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value} className="bg-[#0E0F11]">
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-[0.4rem]">
            <label
              htmlFor="asset-file"
              className="font-[var(--font-sans)] text-[var(--text-xs)] uppercase tracking-[0.08em] font-semibold text-[rgba(255,255,255,0.50)]"
            >
              File <span className="normal-case tracking-normal text-[rgba(255,255,255,0.40)]">(image, PDF or text — max 25 MB)</span>
            </label>
            <input
              ref={fileInputRef}
              id="asset-file"
              type="file"
              accept="image/*,application/pdf,text/*"
              onChange={handleFileChange}
              required
              disabled={uploadMutation.isPending}
              className="block w-full font-[var(--font-sans)] text-[var(--text-sm)] text-[rgba(255,255,255,0.75)] file:mr-[var(--space-3)] file:rounded-[var(--radius)] file:border file:border-[rgba(255,255,255,0.12)] file:bg-[rgba(255,255,255,0.04)] file:px-[var(--space-3)] file:py-[0.4rem] file:font-[var(--font-sans)] file:text-[var(--text-sm)] file:text-[var(--color-text-primary)] file:hover:border-[rgba(255,255,255,0.20)] disabled:opacity-50"
            />
            {file && (
              <p className="font-[var(--font-sans)] text-[var(--text-xs)] text-[rgba(255,255,255,0.50)]">
                Selected: {file.name} ({(file.size / 1024).toFixed(0)} KB)
              </p>
            )}
          </div>

          {(localError || serverError) && (
            <div className="rounded-[var(--radius)] border border-[rgba(239,68,68,0.30)] bg-[rgba(239,68,68,0.08)] px-[var(--space-3)] py-[0.55rem] font-[var(--font-sans)] text-[var(--text-sm)] text-[#FCA5A5]">
              {localError ?? serverError}
            </div>
          )}

          <div className="mt-[var(--space-1)] flex items-center justify-end gap-[var(--space-3)]">
            <button
              type="button"
              onClick={onClose}
              disabled={uploadMutation.isPending}
              className="rounded-[var(--radius)] border border-[rgba(255,255,255,0.18)] px-[var(--space-4)] py-[0.5rem] font-[var(--font-sans)] text-[var(--text-sm)] text-[var(--color-text-primary)] transition-colors hover:border-[rgba(255,255,255,0.32)] disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploadMutation.isPending}
              className="rounded-[var(--radius)] bg-[var(--color-primary)] px-[var(--space-4)] py-[0.5rem] font-[var(--font-sans)] text-[var(--text-sm)] font-medium text-[var(--color-primary-foreground)] transition-colors hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
            >
              {uploadMutation.isPending ? "Uploading…" : "Upload"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
