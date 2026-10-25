import { list } from "@/lib/store";
import { isUser } from "@/lib/session";

// Profile photo bytes. Public like the rest of the app (the link is shared by the two of us);
// the ?v= version in the URL makes it safe to cache for a long time.
export async function GET(req: Request, ctx: { params: Promise<{ user: string }> }) {
  const { user } = await ctx.params;
  if (!isUser(user)) return new Response("Not found", { status: 404 });
  const rec = (await list<{ img: string; v: number }>(user, "avatar", "0000-00-00", "0000-00-00"))[0];
  if (!rec) return new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });
  const b64 = rec.data.img.split(",")[1] ?? "";
  const versioned = new URL(req.url).searchParams.has("v");
  return new Response(Buffer.from(b64, "base64"), {
    headers: { "Content-Type": "image/jpeg", "X-Content-Type-Options": "nosniff", "Cache-Control": versioned ? "public, max-age=31536000, immutable" : "no-cache" },
  });
}
