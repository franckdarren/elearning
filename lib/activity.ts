import { db } from "@/lib/db";
import { activityLogs } from "@/lib/db/schema";

/**
 * Fire-and-forget activity log. Never throws — logging must never break the
 * caller. Failures are surfaced through console only.
 */
export async function logActivity({
  userId,
  action,
  metadata,
}: {
  userId?: string | null;
  action: string;
  metadata?: Record<string, unknown> | null;
}) {
  try {
    await db.insert(activityLogs).values({
      userId: userId ?? null,
      action,
      metadata: (metadata ?? null) as never,
    });
  } catch (err) {
    console.error("logActivity failed", err);
  }
}
