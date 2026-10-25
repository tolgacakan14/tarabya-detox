# İkimiz

Tolga ve Eylül için kişiye özel beslenme, antrenman ve motivasyon uygulaması.

- Kanıta dayalı plan motoru: `src/lib/engine.ts` (adaptif TDEE, güvenlik sınırları)
- Ev antrenman programları: `src/lib/programs.ts`
- Diyet koçu (Claude API): `src/lib/coach.ts`
- Puan ve yarış sistemi: `src/lib/state.ts`
- Araştırma özeti: `docs/ARASTIRMA.md`

## Ortam değişkenleri (Vercel)

| Anahtar | Açıklama |
|---|---|
| `DATABASE_URL` | Neon Postgres bağlantısı (Vercel Storage → Neon ile otomatik gelir) |
| `GROQ_API_KEY` | Diyet koçu için, ücretsiz (console.groq.com). Alternatif: `GEMINI_API_KEY` ya da `ANTHROPIC_API_KEY` |
| `SESSION_SECRET` | Rastgele uzun bir metin, giriş çerezini imzalar |
| `GROQ_MODEL` / `GEMINI_MODEL` | İsteğe bağlı, boşsa uygun model otomatik seçilir |

`DATABASE_URL` yoksa uygulama geçici bellek kullanır; veriler kalıcı değildir.
