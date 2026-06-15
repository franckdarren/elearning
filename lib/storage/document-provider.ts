import { createServiceRoleClient } from "@/lib/supabase/server";

export const DOCUMENT_BUCKET = "documents";
export const DEFAULT_SIGNED_URL_TTL_SECONDS = 60 * 60; // 1h max

export interface DocumentProvider {
  upload(file: File | Blob, path: string): Promise<string>;
  getSignedUrl(path: string, expiresIn?: number): Promise<string>;
  delete(path: string): Promise<void>;
}

export class SupabaseDocumentProvider implements DocumentProvider {
  async upload(file: File | Blob, path: string): Promise<string> {
    const supabase = createServiceRoleClient();
    const { error } = await supabase.storage
      .from(DOCUMENT_BUCKET)
      .upload(path, file, { upsert: false, contentType: file.type });
    if (error) throw error;
    return path;
  }

  async getSignedUrl(
    path: string,
    expiresIn: number = DEFAULT_SIGNED_URL_TTL_SECONDS,
  ): Promise<string> {
    const ttl = Math.min(expiresIn, DEFAULT_SIGNED_URL_TTL_SECONDS);
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase.storage
      .from(DOCUMENT_BUCKET)
      .createSignedUrl(path, ttl);
    if (error) throw error;
    return data.signedUrl;
  }

  async delete(path: string): Promise<void> {
    const supabase = createServiceRoleClient();
    const { error } = await supabase.storage
      .from(DOCUMENT_BUCKET)
      .remove([path]);
    if (error) throw error;
  }
}

export const documentProvider: DocumentProvider = new SupabaseDocumentProvider();
