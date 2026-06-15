import { NextResponse, type NextRequest } from "next/server";
import { and, eq, isNotNull, lte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  resources,
  quizzes,
  notifications,
  chapters,
  studentSubjectAccess,
} from "@/lib/db/schema";
import { logActivity } from "@/lib/activity";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET not configured" },
      { status: 500 },
    );
  }
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runPublishCron();
    await logActivity({
      action: "cron.publish",
      metadata: result as Record<string, unknown>,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("cron.publish failed", err);
    await logActivity({
      action: "cron.publish.error",
      metadata: { message: err instanceof Error ? err.message : String(err) },
    });
    return NextResponse.json(
      { ok: false, error: "Cron failed" },
      { status: 500 },
    );
  }
}

async function runPublishCron() {
  return db.transaction(async (tx) => {
    // 1) Promote scheduled resources whose publication date is past.
    const promoted = await tx
      .update(resources)
      .set({ status: "published" })
      .where(
        and(
          eq(resources.status, "scheduled"),
          isNotNull(resources.publishedAt),
          lte(resources.publishedAt, sql`now()`),
        ),
      )
      .returning({
        id: resources.id,
        chapterId: resources.chapterId,
        type: resources.type,
        title: resources.title,
      });

    let notificationsCreated = 0;
    for (const r of promoted) {
      const [chap] = await tx
        .select({
          classId: chapters.classId,
          subjectId: chapters.subjectId,
        })
        .from(chapters)
        .where(eq(chapters.id, r.chapterId))
        .limit(1);
      if (!chap) continue;

      const subs = await tx
        .select({ studentId: studentSubjectAccess.studentId })
        .from(studentSubjectAccess)
        .where(
          and(
            eq(studentSubjectAccess.classId, chap.classId),
            eq(studentSubjectAccess.subjectId, chap.subjectId),
          ),
        );
      if (subs.length === 0) continue;

      const type = r.type === "video" ? "new_course" : "new_document";
      const title =
        r.type === "video" ? "Nouvelle vidéo publiée" : "Nouveau document publié";

      await tx.insert(notifications).values(
        subs.map((s) => ({
          userId: s.studentId,
          type: type as "new_course" | "new_document",
          title,
          body: r.title,
          link: `/student/chapter/${r.chapterId}`,
        })),
      );
      notificationsCreated += subs.length;
    }

    // 2) Archive resources whose unpublish_at is past.
    const archivedResources = await tx
      .update(resources)
      .set({ status: "archived" })
      .where(
        and(
          eq(resources.status, "published"),
          isNotNull(resources.unpublishAt),
          lte(resources.unpublishAt, sql`now()`),
        ),
      )
      .returning({ id: resources.id });

    // 3) Archive quizzes past closes_at.
    const archivedQuizzes = await tx
      .update(quizzes)
      .set({ status: "archived" })
      .where(
        and(
          eq(quizzes.status, "published"),
          isNotNull(quizzes.closesAt),
          lte(quizzes.closesAt, sql`now()`),
        ),
      )
      .returning({ id: quizzes.id });

    return {
      promoted: promoted.length,
      notifications: notificationsCreated,
      archivedResources: archivedResources.length,
      archivedQuizzes: archivedQuizzes.length,
    };
  });
}
