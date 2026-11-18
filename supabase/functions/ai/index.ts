// Supabase Edge Function "ai": leitet Anfragen an Claude weiter.
// Der API-Schlüssel liegt als Secret ANTHROPIC_API_KEY auf dem Server – nie im Browser.
import { createClient } from "npm:@supabase/supabase-js@2";

const MODEL = Deno.env.get("AI_MODEL") ?? "claude-haiku-5-5"; // günstig und schnell
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, "content-type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  // Nur angemeldete Nutzer dürfen die KI verwenden
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return json({ error: "Nicht angemeldet" }, 401);

  const { prompt, max_tokens } = await req.json();
  if (!prompt || String(prompt).length > 60000) return json({ error: "Ungültige Anfrage" }, 400);

  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": Deno.env.get("ANTHROPIC_API_KEY")!,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: Math.min(Number(max_tokens) || 1500, 2000),
      messages: [{ role: "user", content: String(prompt) }],
    }),
  });
  const j = await r.json();
  if (!r.ok) return json({ error: j?.error?.message ?? "KI-Fehler" }, 502);
  const text = (j.content ?? []).map((c: { text?: string }) => c.text ?? "").join("");
  return json({ text });
});
