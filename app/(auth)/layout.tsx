export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="flex flex-1 items-center justify-center bg-zinc-50 px-4 py-12 dark:bg-zinc-950">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            La-Passerelle Du Savoir
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Plateforme d&apos;apprentissage en ligne
          </p>
        </div>
        {children}
      </div>
    </main>
  );
}
