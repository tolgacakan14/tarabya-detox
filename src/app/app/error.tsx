"use client";
// Friendly fallback if any screen crashes, instead of the browser's blank error page.
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="min-h-dvh grid place-items-center p-6 text-center">
      <div className="panel max-w-sm">
        <p className="text-5xl" aria-hidden>
          🙈
        </p>
        <h1 className="display text-2xl font-bold mt-2">Bir şey ters gitti</h1>
        <p className="mt-2" style={{ color: "var(--ink-2)" }}>
          Kayıtların güvende. Sayfayı yeniden yükleyelim.
        </p>
        <button className="btn btn-me w-full mt-4" onClick={() => reset()}>
          Tekrar dene
        </button>
        <a className="block mt-3 underline text-sm" href="/">
          Profil seçimine dön
        </a>
        {error?.digest && <p className="label mt-3">Kod: {error.digest}</p>}
      </div>
    </main>
  );
}
