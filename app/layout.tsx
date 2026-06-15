import type { Metadata } from "next";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "La-Passerelle Du Savoir",
  description: "Plateforme LMS — cours, documents et QCM pour vos classes.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={cn("h-full", "antialiased")}>
      <body className="min-h-full flex flex-col font-sans">
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
