"use client";

import { useEffect, useState } from "react";
import { getResourceSignedUrl, markProgress } from "@/lib/actions/student-resources";
import { Button } from "@/components/ui/button";

export function DocumentViewer({ resourceId }: { resourceId: string }) {
  const [src, setSrc] = useState<string | null>(null);
  const [downloadable, setDownloadable] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const r = await getResourceSignedUrl(resourceId);
      if (cancelled) return;
      if (!r.ok) {
        setError(r.error);
        return;
      }
      if (r.type !== "document") {
        setError("Type de ressource inattendu");
        return;
      }
      setSrc(r.signedUrl);
      setDownloadable(r.downloadable);
      // Mark "read" on open.
      await markProgress({
        resourceId,
        watchedSeconds: 0,
        completed: true,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [resourceId]);

  if (error) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
        {error}
      </div>
    );
  }

  if (!src) {
    return (
      <p className="text-sm text-zinc-500">Préparation du document…</p>
    );
  }

  return (
    <div className="space-y-2">
      <iframe
        src={`${src}#toolbar=0&navpanes=0&scrollbar=1`}
        className="h-[70vh] w-full rounded-md border border-zinc-200 dark:border-zinc-800"
        title="Document"
      />
      {downloadable ? (
        <div>
          <a href={src} target="_blank" rel="noopener noreferrer" download>
            <Button variant="outline" size="sm">
              Télécharger
            </Button>
          </a>
        </div>
      ) : (
        <p className="text-xs text-zinc-500">
          Document en lecture seule. Le téléchargement n&apos;est pas autorisé.
        </p>
      )}
    </div>
  );
}
