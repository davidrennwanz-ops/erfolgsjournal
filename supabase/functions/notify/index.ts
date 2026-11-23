// Erfolgsjournal – Benachrichtigungen (Push + E-Mail)
// Wird alle 15 Minuten per pg_cron aufgerufen. Liest nur Einstellungen und vorbereitete Texte –
// die Journal-Einträge selbst bleiben verschlüsselt und werden hier nie gelesen.
import { createClient } from "jsr:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron", "Content-Type": "application/json" };
const json = (o: unknown, s = 200) => new Response(JSON.stringify(o), { status: s, headers: cors });

async function secret(name: string) { const { data } = await sb.from("app_secrets").select("value").eq("name", name).maybeSingle(); return data?.value as string | undefined; }
async function vapid() {
  let pub = await secret("vapid_public"), priv = await secret("vapid_private");
  if (!pub || !priv) {
    const k = webpush.generateVAPIDKeys(); pub = k.publicKey; priv = k.privateKey;
    await sb.from("app_secrets").upsert([{ name: "vapid_public", value: pub }, { name: "vapid_private", value: priv }]);
  }
  webpush.setVapidDetails("mailto:" + (Deno.env.get("MAIL_FROM") || "info@erfolgsjournal.app"), pub, priv);
  return pub;
}
function localNow(tz: string) {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date()).map(x => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, min: (+p.hour % 24) * 60 + +p.minute };
}
type Cfg = { on?: boolean; time?: string; mail?: boolean; push?: boolean; items?: string[] };

async function compose(row: any, kind: "morning" | "evening", date: string) {
  const cfg: Cfg = row[kind] || {}; const items = cfg.items || [];
  const { data: q } = await sb.from("notify_queue").select("subject,body").eq("user_id", row.user_id).eq("kind", kind).eq("for_date", date).maybeSingle();
  const name = row.name ? `, ${row.name}` : "";
  const parts: string[] = [];
  let title: string;
  if (kind === "morning") {
    title = `Guten Morgen${name}`;
    if (items.includes("review")) parts.push(q?.body || "Gestern hast du keinen Tagesabschluss gemacht – das ist okay. Wichtig ist nicht der perfekte Tag, sondern dass du wieder einsteigst. Heute ist ein neuer Tag und eine neue Chance.");
    if (items.includes("goal") && row.goal_text) parts.push(`Dein Masterziel: ${row.goal_text}`);
    if (items.includes("plan")) parts.push("Leg heute als Erstes deinen Tagesfokus und deine 2 Schritte fest. Eine Sache, die dich deinem Ziel näherbringt.");
  } else {
    title = `Zeit für deinen Tagesabschluss${name}`;
    if (items.includes("habits") && q?.body) parts.push(q.body);
    if (items.includes("reflect")) parts.push("Nimm dir 3 Minuten: Was lief heute gut, was machst du morgen besser?");
    if (items.includes("win")) parts.push("Was war heute dein Erfolg? Halte ihn fest – auch kleine Siege zählen.");
  }
  if (!parts.length) parts.push(kind === "morning" ? "Dein Tag beginnt. Ein Schritt für dein Ziel – mehr braucht es heute nicht." : "Schließ deinen Tag kurz ab – dein Journal wartet auf dich.");
  return { title, parts, subject: q?.subject || title };
}

async function sendPush(userId: string, title: string, body: string, url: string) {
  const { data: subs } = await sb.from("push_subs").select("*").eq("user_id", userId);
  let n = 0;
  for (const s of subs || []) {
    try { await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify({ title, body, url })); n++; }
    catch (e: any) { if (e?.statusCode === 404 || e?.statusCode === 410) await sb.from("push_subs").delete().eq("endpoint", s.endpoint); }
  }
  return n;
}
async function sendMail(to: string, subject: string, title: string, parts: string[], url: string) {
  const key = Deno.env.get("BREVO_API_KEY"), from = Deno.env.get("MAIL_FROM");
  if (!key || !from || !to) return false;
  const esc = (t: string) => t.replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]!));
  const html = `<div style="background:#f3f0e8;padding:28px 12px;font-family:Georgia,serif;color:#1c2230"><div style="max-width:520px;margin:0 auto;background:#fffdf8;border:1px solid #e3dccd;border-left:4px solid #b08d3c;border-radius:6px;padding:26px 28px">
    <div style="font:600 11px Arial,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:#9a7420">Erfolgsjournal</div>
    <h1 style="font-weight:500;font-size:24px;margin:8px 0 16px">${esc(title)}</h1>
    ${parts.map(p => `<p style="font:16px/1.6 Arial,sans-serif;margin:0 0 14px">${esc(p)}</p>`).join("")}
    <a href="${url}" style="display:inline-block;margin-top:6px;background:#b08d3c;color:#fff;text-decoration:none;font:600 15px Arial,sans-serif;padding:11px 20px;border-radius:4px">Journal öffnen</a></div>
    <p style="text-align:center;font:12px Arial,sans-serif;color:#8a8478;margin-top:14px">Du bekommst diese Mail, weil du sie im Erfolgsjournal eingestellt hast. Abbestellen: Einstellungen → Benachrichtigungen.</p></div>`;
  const r = await fetch("https://api.brevo.com/v3/smtp/email", { method: "POST", headers: { "api-key": key, "Content-Type": "application/json" },
    body: JSON.stringify({ sender: { name: "Erfolgsjournal", email: from }, to: [{ email: to }], subject, htmlContent: html, textContent: [title, ...parts, url].join("\n\n") }) });
  return r.ok;
}
async function deliver(row: any, kind: "morning" | "evening", date: string, force = false) {
  const cfg: Cfg = row[kind] || {};
  const { title, parts, subject } = await compose(row, kind, date);
  const url = (row.app_url || "https://davidrennwanz-ops.github.io/erfolgsjournal/") + "#tag";
  const ch: string[] = [];
  if (cfg.push || force) { const n = await sendPush(row.user_id, title, parts.join("\n\n").slice(0, 900), url); if (n) ch.push(`push:${n}`); }
  if (cfg.mail || force) { if (await sendMail(row.email, subject, title, parts, url)) ch.push("mail"); }
  return { ch, title, parts };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const body = await req.json().catch(() => ({}));
  const pub = await vapid();
  // Aufruf aus der App (angemeldet): Schlüssel holen oder Testnachricht
  const auth = req.headers.get("authorization")?.replace("Bearer ", "");
  if (body.action === "init" || body.action === "test") {
    const { data: u } = await sb.auth.getUser(auth || "");
    if (!u?.user) return json({ error: "nicht angemeldet" }, 401);
    if (body.action === "init") return json({ vapid: pub });
    const { data: row } = await sb.from("notify_settings").select("*").eq("user_id", u.user.id).maybeSingle();
    if (!row) return json({ error: "keine Einstellungen gespeichert" }, 400);
    const kind = body.kind === "evening" ? "evening" : "morning";
    const r = await deliver(row, kind, localNow(row.tz || "Europe/Berlin").date, true);
    return json({ ok: true, sent: r.ch, preview: r });
  }
  // Zeitgesteuerter Aufruf (pg_cron)
  if (req.headers.get("x-cron") !== (await secret("cron_token"))) return json({ error: "forbidden" }, 403);
  const { data: rows } = await sb.from("notify_settings").select("*");
  const out: unknown[] = [];
  for (const row of rows || []) for (const kind of ["morning", "evening"] as const) {
    const cfg: Cfg = row[kind] || {}; if (!cfg.on || !cfg.time) continue;
    const { date, min } = localNow(row.tz || "Europe/Berlin");
    const [h, m] = cfg.time.split(":").map(Number), t = h * 60 + m;
    if (min < t || min >= t + 30) continue;
    const { data: done } = await sb.from("notify_log").select("user_id").eq("user_id", row.user_id).eq("kind", kind).eq("for_date", date).maybeSingle();
    if (done) continue;
    const r = await deliver(row, kind, date);
    await sb.from("notify_log").insert({ user_id: row.user_id, kind, for_date: date, channels: r.ch.join(",") });
    out.push({ kind, ch: r.ch });
  }
  return json({ ok: true, sent: out.length });
});
