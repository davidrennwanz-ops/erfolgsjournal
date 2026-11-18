# Erfolgsjournal – deine eigene Website einrichten

Dauer: ca. 30 Minuten · Kosten: 0 € (KI optional, wenige Euro im Monat)
Du brauchst: einen PC mit Browser und dein Android-Handy.

> Hinweis: Bei GitHub und Supabase können Menüpunkte leicht anders heißen oder anders angeordnet sein. Die Reihenfolge bleibt gleich.

---

## Was in diesem Paket steckt

| Datei / Ordner | Wofür |
|---|---|
| `index.html` | Das Erfolgsjournal selbst |
| `config.js` | Hier trägst du deine zwei Supabase-Werte ein |
| `manifest.webmanifest`, `sw.js`, `icons/` | Damit du die Seite auf dem Handy als App installieren kannst |
| `supabase/schema.sql` | Legt die Datenbank-Tabelle an |
| `supabase/functions/ai/index.ts` | Optional: die KI-Funktion (Sprechen → Felder ausfüllen, KI-Rückblick) |

Tipp: Bevor du startest, kannst du `index.html` einfach doppelklicken. Dann läuft das Journal im **Testmodus** (nur auf diesem Gerät, ohne Login).

---

## Schritt 1 – GitHub: Website ins Netz stellen

1. Auf **github.com** ein kostenloses Konto anlegen.
2. Oben rechts auf **„+“ → „New repository“**.
   - Name: `erfolgsjournal`
   - **Public** auswählen (nur so ist GitHub Pages kostenlos – öffentlich ist nur der Programmcode, **nicht deine Einträge**).
   - **„Create repository“**.
3. Auf der neuen Seite: **„uploading an existing file“** anklicken.
4. Den **Inhalt** des entpackten Ordners hineinziehen (alle Dateien **und** die Ordner `icons` und `supabase`). → **„Commit changes“**.
5. Im Repository: **Settings → Pages**.
   - Source: **„Deploy from a branch“**, Branch: **main**, Ordner: **/ (root)** → **Save**.
6. Nach 1–2 Minuten steht oben die Adresse, z. B.
   `https://DEINNAME.github.io/erfolgsjournal/` → **notieren**.

## Schritt 2 – Supabase: Login & Datenbank

1. Auf **supabase.com** → **„Start your project“** → am einfachsten **mit GitHub anmelden**.
2. **„New project“**:
   - Name: `erfolgsjournal`
   - Database Password: ein sicheres Passwort **(notieren!)**
   - Region: **Central EU (Frankfurt)**
   - **„Create new project“** – kurz warten.
3. Links **„SQL Editor“** → **„New query“** → den kompletten Inhalt von `supabase/schema.sql` einfügen → **„Run“**.
   Ergebnis: „Success“. Jetzt gibt es die Tabelle `journal`, und jeder sieht nur seine eigenen Daten.
4. Links **„Authentication“**:
   - **Sign In / Providers → Email**: **„Confirm email“ ausschalten** (dann musst du keinen Bestätigungslink klicken). Speichern.
   - **URL Configuration → Site URL**: deine GitHub-Adresse aus Schritt 1 eintragen. Speichern.
5. Links **„Project Settings“ → „API“** (bzw. „Data API“ / „API Keys“):
   - **Project URL** kopieren (z. B. `https://abcd1234.supabase.co`)
   - **anon / public key** kopieren (langer Text, beginnt meist mit `eyJ…`)

## Schritt 3 – Website mit Supabase verbinden

1. Auf GitHub in deinem Repository die Datei **`config.js`** öffnen → **Stift-Symbol** (Bearbeiten).
2. Die beiden Platzhalter ersetzen:
   ```js
   SUPABASE_URL: "https://abcd1234.supabase.co",
   SUPABASE_ANON_KEY: "eyJ…dein-langer-schlüssel…"
   ```
3. **„Commit changes“**. Nach ca. 1 Minute ist die Website aktualisiert.

## Schritt 4 – Dein Konto anlegen und abschließen

1. Deine Website-Adresse öffnen → E-Mail + Passwort eingeben → **„Konto erstellen“**.
2. **Wichtig, damit sich niemand sonst registrieren kann:**
   Supabase → **Authentication → Sign In / Providers** → **„Allow new users to sign up“ ausschalten**. Speichern.
3. **Deine bisherigen Einträge übernehmen** (aus der Claude-Version):
   - In der Claude-Version: **Einstellungen → „Alle Daten kopieren“**.
   - In der neuen Website: **Einstellungen → Datensicherung → „Daten aus der Claude-Version übernehmen“** → einfügen → **„Übernehmen“**.

## Schritt 5 – Auf dem Android-Handy installieren

1. **Chrome** öffnen → deine Website-Adresse aufrufen → anmelden.
2. Menü **⋮** (oben rechts) → **„App installieren“** (oder „Zum Startbildschirm hinzufügen“).
3. Fertig: Das Erfolgsjournal hat jetzt ein eigenes Icon und öffnet im Vollbild – wie eine App.

**Spracheingabe:** Der 🎙️-Button nutzt die Spracherkennung von Chrome. Alternativ geht immer die Mikrofon-Taste deiner Tastatur.

---

## Optional – Schritt 6: KI einschalten

Die KI trägt Gesprochenes in die richtigen Felder ein und schreibt den Wochenrückblick. Sie ist der einzige Teil, der Geld kostet (Abrechnung pro Nutzung).

1. Auf **console.anthropic.com** ein Konto anlegen → Guthaben aufladen (z. B. 5 $) → **API Keys → „Create Key“** → Schlüssel kopieren.
   Tipp: Unter **Limits** ein monatliches Ausgabenlimit setzen.
2. Supabase → links **„Edge Functions“** → **„Deploy a new function“** → **„Via Editor“**.
   - Name: **`ai`** (genau so)
   - Den kompletten Inhalt von `supabase/functions/ai/index.ts` einfügen → **„Deploy“**.
3. Supabase → **Edge Functions → Secrets** (bzw. „Manage secrets“) → neues Secret:
   - Name: `ANTHROPIC_API_KEY`
   - Wert: dein Schlüssel aus Punkt 1 → Speichern.
4. Im Journal 🎙️ antippen, etwas sagen → **„✨ Eintragen“**. Fertig.

Der Schlüssel liegt nur bei Supabase, nicht in deiner Website – und die Funktion antwortet nur angemeldeten Nutzern.

---

## Gut zu wissen

- **Datensicherung:** Einmal im Monat unter **Einstellungen → „Daten exportieren“**. Die Datei ist deine Sicherung; mit „Importieren“ holst du sie zurück.
- **Pause bei Nichtnutzung:** Kostenlose Supabase-Projekte pausieren, wenn sie eine Woche lang kaum genutzt werden. Bei täglicher Nutzung passiert das nicht. Falls doch: Supabase öffnen → Projekt → **„Restore“**. Deine Daten bleiben erhalten.
- **Offline:** Die App öffnet auch ohne Netz mit dem letzten Stand. Neue Einträge werden gespeichert, sobald du wieder online bist.
- **Updates:** Neue Version = neue `index.html` bei GitHub hochladen (die alte überschreiben). Deine Daten bleiben unberührt.
