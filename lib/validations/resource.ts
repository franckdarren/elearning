import { z } from "zod";

export const contentStatuses = [
  "draft",
  "scheduled",
  "published",
  "archived",
] as const;
export const contentStatusSchema = z.enum(contentStatuses);

export const documentAccessSchema = z.enum(["downloadable", "view_only"]);

const optionalTimestamp = z
  .string()
  .trim()
  .optional()
  .or(z.literal("").transform(() => undefined));

const baseResource = z.object({
  id: z.string().uuid().optional(),
  chapterId: z.string().uuid(),
  sequenceId: z
    .string()
    .uuid()
    .optional()
    .or(z.literal("").transform(() => undefined)),
  title: z.string().trim().min(1, "Titre requis").max(200),
  description: z
    .string()
    .trim()
    .max(2000)
    .transform((v) => (v.length === 0 ? null : v))
    .nullable()
    .optional(),
  status: contentStatusSchema.default("draft"),
  publishedAt: optionalTimestamp,
  unpublishAt: optionalTimestamp,
});

export const videoResourceSchema = baseResource.extend({
  durationSeconds: z.coerce.number().int().min(0).optional(),
  author: z
    .string()
    .trim()
    .max(120)
    .transform((v) => (v.length === 0 ? null : v))
    .nullable()
    .optional(),
});

export const documentResourceSchema = baseResource.extend({
  documentAccess: documentAccessSchema.default("view_only"),
});

export type VideoResourceInput = z.infer<typeof videoResourceSchema>;
export type DocumentResourceInput = z.infer<typeof documentResourceSchema>;

export const resourceStatusSchema = z.object({
  id: z.string().uuid(),
  status: contentStatusSchema,
  publishedAt: optionalTimestamp,
  unpublishAt: optionalTimestamp,
});
export type ResourceStatusInput = z.infer<typeof resourceStatusSchema>;
