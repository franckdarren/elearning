"use client";

import { useEffect, useRef, useState } from "react";
import { getResourceSignedUrl, markProgress } from "@/lib/actions/student-resources";

const PROGRESS_PUSH_INTERVAL_MS = 10_000;
const COMPLETED_FRACTION = 0.9;

export function SecureVideoPlayer({
  resourceId,
  thumbnailUrl,
}: {
  resourceId: string;
  thumbnailUrl: string | null;
}) {
  const [src, setSrc] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastPushedRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const r = await getResourceSignedUrl(resourceId);
      if (cancelled) return;
      if (!r.ok) setError(r.error);
      else if (r.type === "video") setSrc(r.signedUrl);
      else setError("Type de ressource inattendu");
    })();
    return () => {
      cancelled = true;
    };
  }, [resourceId]);

  // Periodic progress push.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const id = window.setInterval(async () => {
      const t = Math.floor(video.currentTime);
      if (t === lastPushedRef.current) return;
      lastPushedRef.current = t;
      const duration = video.duration;
      const isCompleted =
        !completed && duration > 0 && t / duration >= COMPLETED_FRACTION;
      await markProgress({
        resourceId,
        watchedSeconds: t,
        completed: isCompleted,
      });
      if (isCompleted) setCompleted(true);
    }, PROGRESS_PUSH_INTERVAL_MS);

    return () => window.clearInterval(id);
  }, [resourceId, completed]);

  if (error) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <video
        ref={videoRef}
        src={src ?? undefined}
        poster={thumbnailUrl ?? undefined}
        controls
        controlsList="nodownload noremoteplayback"
        disablePictureInPicture
        playsInline
        onContextMenu={(e) => e.preventDefault()}
        className="aspect-video w-full rounded-md bg-black"
      />
      {!src ? (
        <p className="text-xs text-zinc-500">Préparation de la lecture…</p>
      ) : null}
      {completed ? (
        <p className="text-xs text-emerald-600">Vidéo marquée comme terminée.</p>
      ) : null}
    </div>
  );
}
