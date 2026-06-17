"use client";

import { useRef, useState } from "react";
import { UploadCloudIcon, XIcon, FileTextIcon, VideoIcon, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type FileVariant = "video" | "document" | "image";

interface FileInputProps {
  id: string;
  name: string;
  accept?: string;
  required?: boolean;
  hint?: string;
  variant?: FileVariant;
}

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

const VariantIcon = {
  video: VideoIcon,
  document: FileTextIcon,
  image: ImageIcon,
} satisfies Record<FileVariant, React.ElementType>;

export function FileInput({
  id,
  name,
  accept,
  required,
  hint,
  variant = "document",
}: FileInputProps) {
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const Icon = VariantIcon[variant];

  function applyFile(f: File | null) {
    setFile(f);
    if (inputRef.current) {
      if (f) {
        const dt = new DataTransfer();
        dt.items.add(f);
        inputRef.current.files = dt.files;
      } else {
        inputRef.current.value = "";
      }
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    applyFile(e.target.files?.[0] ?? null);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    applyFile(e.dataTransfer.files?.[0] ?? null);
  }

  function handleRemove(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    applyFile(null);
  }

  return (
    <>
      <input
        ref={inputRef}
        id={id}
        name={name}
        type="file"
        accept={accept}
        required={required}
        className="sr-only"
        onChange={handleChange}
      />

      {file ? (
        <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 px-3 py-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10">
            <Icon className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium leading-tight">{file.name}</p>
            <p className="text-xs text-muted-foreground">{formatSize(file.size)}</p>
          </div>
          <button
            type="button"
            onClick={handleRemove}
            className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Supprimer le fichier"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <label
          htmlFor={id}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={cn(
            "flex cursor-pointer flex-col items-center gap-3 rounded-lg border-2 border-dashed px-6 py-7 text-center transition-colors select-none",
            dragging
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/40 hover:bg-muted/30",
          )}
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-muted">
            <UploadCloudIcon className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">
              Glisser-déposer ou{" "}
              <span className="text-primary underline-offset-2 hover:underline">
                parcourir
              </span>
            </p>
            {hint && (
              <p className="text-xs text-muted-foreground">{hint}</p>
            )}
          </div>
        </label>
      )}
    </>
  );
}
