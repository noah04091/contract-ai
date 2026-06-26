/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * PremiumChat.tsx — Generate 2.0 "Premium-Modus" (Chat-Oberfläche)
 * ------------------------------------------------------------------
 * Vertrag erstellen wie im Gespräch mit der KI (Claude Opus):
 * beschreiben → KI fragt das Nötige nach → schreibt den Vertrag →
 * im Chat weiter anpassen → PDF herunterladen.
 *
 * Verdrahtet mit dem additiven Backend:
 *   POST /api/contracts/premium/chat      (Rückfragen / ready?)
 *   POST /api/contracts/premium/generate  (Vertrag erzeugen + speichern)
 *   POST /api/contracts/premium/pdf        (Premium-PDF, AVV-Stil)
 */
import { useState, useRef, useEffect, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import { Sparkles, Send, Download, Lock, ArrowLeft, ArrowRight, ShieldCheck, Check, PenLine, AlertTriangle, X, Bell, Calendar, ChevronDown, BookOpen, Eye, Palette, Image as ImageIcon } from "lucide-react";
import { toast } from "react-toastify";
import EnhancedSignatureModal from "./EnhancedSignatureModal";
import { useAuth } from "../hooks/useAuth";
import { startGenerateUnlock, startBusinessSubscription } from "../utils/startAnalysisUnlock";

type Kind = "text" | "questions" | "contract" | "generating" | "review" | "streaming" | "events" | "explain" | "demolock";
interface CalItem { title: string; date: string; severity?: string }
type DesignCfg = string | { style: string; accent: string };
interface ExplainData { summary: string; items: { titel: string; erklaerung: string; rechtsgrundlage: string }[] }
interface ReviewData { verdict: string; summary: string; checks: { klausel: string; status: string; hinweis: string }[]; empfehlungen: string[] }
interface ChatMsg {
  role: "user" | "assistant";
  kind: Kind;
  content: string;          // an die API gesendeter Text
  display?: string;         // optionaler kurzer Anzeigetext (statt content) in der Blase
  uiOnly?: boolean;         // z.B. Begrüßung – nicht an die API
  questions?: { id: string; frage: string; warum: string }[];
  contractType?: string;    // bei Frage-Nachrichten: erkannter Typ (für „Überspringen")
  contract?: { contractId: string; contractText: string; contractType: string; title?: string };
  review?: ReviewData;
  calItems?: CalItem[];
  explainData?: ExplainData;
  lockPreview?: string;          // 🔒 Free: kurze (geblurrte) Vorschau hinter der Sperr-Karte
  lockContractId?: string | null; // 🔒 Free: ID des gesperrten Vertrags → Einmal-Freischaltung (9,90 €)
}

const C = {
  blue: "#2E6CF6", blue2: "#1E53D8", ink: "#0B1324", muted: "#667085",
  muted2: "#8a94a6", border: "#E7EAF0", track: "#EEF1F6", bg: "#F7F9FC",
};

// Schnellstart-Vorschläge (nur solange der Chat frisch ist)
const QUICK_STARTS = [
  { emoji: "💼", label: "Freelancer-Vertrag", prompt: "Ich möchte einen Freelancer-Vertrag erstellen." },
  { emoji: "🏠", label: "Mietvertrag", prompt: "Ich möchte einen Mietvertrag erstellen." },
  { emoji: "🛒", label: "Kaufvertrag", prompt: "Ich möchte einen Kaufvertrag erstellen." },
  { emoji: "🔒", label: "NDA", prompt: "Ich möchte eine Geheimhaltungsvereinbarung (NDA) erstellen." },
  { emoji: "💻", label: "Arbeitsvertrag", prompt: "Ich möchte einen Arbeitsvertrag erstellen." },
  { emoji: "🎯", label: "Beratervertrag", prompt: "Ich möchte einen Beratervertrag erstellen." },
];

// Beispiel-Verträge für die Free-Demo (kein KI-Lauf, reine Vorschau → Upsell).
// Pro Vertragstyp ein passendes Beispiel, damit die Demo zu dem passt, was der/die
// Nutzer:in beschreibt (statt immer ein Freelancer-Vertrag).
const DEMO_CONTRACTS: Record<string, { title: string; text: string }> = {
  freelancer: {
    title: "Freelancer-Vertrag",
    text: `FREELANCER-VERTRAG (WEBENTWICKLUNG)

zwischen
Herrn Max Beispiel, Musterstraße 1, 10115 Berlin – nachfolgend „Auftragnehmer" –
und
der Beispiel GmbH, Hauptstraße 5, 20095 Hamburg – nachfolgend „Auftraggeber" –

§ 1 Vertragsgegenstand
(1) Der Auftragnehmer erbringt Leistungen der Webentwicklung gemäß Anlage 1.

§ 2 Vergütung
(1) Die Vergütung beträgt 80,00 € netto je Stunde zzgl. Umsatzsteuer.
(2) Die Abrechnung erfolgt monatlich nach Stundennachweis.

§ 3 Laufzeit & Kündigung
(1) Der Vertrag läuft auf unbestimmte Zeit, kündbar mit einer Frist von 14 Tagen.

§ 4 Nutzungsrechte
(1) Die Rechte an den Arbeitsergebnissen gehen erst mit vollständiger Bezahlung über.
`,
  },
  miete: {
    title: "Mietvertrag",
    text: `MIETVERTRAG (WOHNRAUM)

zwischen
Herrn Max Beispiel, Musterstraße 1, 10115 Berlin – nachfolgend „Vermieter" –
und
Frau Erika Muster, Hauptstraße 5, 20095 Hamburg – nachfolgend „Mieter" –

§ 1 Mietobjekt
(1) 3-Zimmer-Wohnung, 78 m², Beispielweg 12, 3. OG, nebst Kellerabteil.

§ 2 Mietzeit
(1) Das Mietverhältnis beginnt am 01.08.2026 und läuft auf unbestimmte Zeit.

§ 3 Miete
(1) Die Kaltmiete beträgt 950,00 €, die Nebenkostenvorauszahlung 220,00 €.
(2) Die Gesamtmiete von 1.170,00 € ist monatlich im Voraus zu zahlen.

§ 4 Kaution
(1) Der Mieter leistet eine Kaution in Höhe von drei Kaltmieten (2.850,00 €).

§ 5 Kündigung
(1) Es gelten die gesetzlichen Kündigungsfristen gemäß § 573c BGB.
`,
  },
  kauf: {
    title: "Kaufvertrag",
    text: `KAUFVERTRAG

zwischen
Herrn Max Beispiel, Musterstraße 1, 10115 Berlin – nachfolgend „Verkäufer" –
und
Frau Erika Muster, Hauptstraße 5, 20095 Hamburg – nachfolgend „Käufer" –

§ 1 Kaufgegenstand
(1) Gebrauchter Pkw, Marke Beispiel, Erstzulassung 2021, ca. 45.000 km.

§ 2 Kaufpreis
(1) Der Kaufpreis beträgt 18.500,00 € inkl. Umsatzsteuer.

§ 3 Übergabe
(1) Übergabe und Zahlung erfolgen Zug um Zug am 15.08.2026.

§ 4 Gewährleistung
(1) Der Verkauf erfolgt unter Ausschluss der Sachmängelhaftung, soweit zulässig.

§ 5 Eigentumsvorbehalt
(1) Das Eigentum geht erst mit vollständiger Kaufpreiszahlung auf den Käufer über.
`,
  },
  nda: {
    title: "Geheimhaltungsvereinbarung (NDA)",
    text: `GEHEIMHALTUNGSVEREINBARUNG (NDA)

zwischen
der Beispiel GmbH, Hauptstraße 5, 20095 Hamburg – nachfolgend „Partei A" –
und
Herrn Max Beispiel, Musterstraße 1, 10115 Berlin – nachfolgend „Partei B" –

§ 1 Gegenstand
(1) Schutz vertraulicher Informationen im Rahmen einer geplanten Zusammenarbeit.

§ 2 Vertraulichkeit
(1) Beide Parteien halten erhaltene Informationen geheim und nutzen sie nur zum vereinbarten Zweck.

§ 3 Ausnahmen
(1) Ausgenommen sind öffentlich bekannte oder rechtmäßig von Dritten erlangte Informationen.

§ 4 Dauer
(1) Die Pflichten gelten für 3 Jahre nach Beendigung der Zusammenarbeit.

§ 5 Vertragsstrafe
(1) Bei schuldhaftem Verstoß wird eine Vertragsstrafe von 5.000,00 € je Fall fällig.
`,
  },
  arbeit: {
    title: "Arbeitsvertrag",
    text: `ARBEITSVERTRAG

zwischen
der Beispiel GmbH, Hauptstraße 5, 20095 Hamburg – nachfolgend „Arbeitgeber" –
und
Frau Erika Muster, Musterstraße 1, 10115 Berlin – nachfolgend „Arbeitnehmer" –

§ 1 Tätigkeit
(1) Anstellung als Software-Entwickler:in ab dem 01.09.2026.

§ 2 Arbeitszeit
(1) Die regelmäßige Arbeitszeit beträgt 40 Stunden pro Woche.

§ 3 Vergütung
(1) Das Bruttogehalt beträgt 4.500,00 € monatlich.

§ 4 Urlaub
(1) Der Urlaubsanspruch beträgt 28 Arbeitstage pro Kalenderjahr.

§ 5 Probezeit
(1) Die ersten 6 Monate gelten als Probezeit mit einer Kündigungsfrist von 2 Wochen.
`,
  },
  berater: {
    title: "Beratervertrag",
    text: `BERATERVERTRAG

zwischen
Herrn Max Beispiel, Musterstraße 1, 10115 Berlin – nachfolgend „Berater" –
und
der Beispiel GmbH, Hauptstraße 5, 20095 Hamburg – nachfolgend „Auftraggeber" –

§ 1 Gegenstand
(1) Strategische Unternehmensberatung gemäß Leistungsbeschreibung in Anlage 1.

§ 2 Vergütung
(1) Der Tagessatz beträgt 1.200,00 € netto zzgl. Umsatzsteuer.

§ 3 Laufzeit
(1) Der Vertrag läuft 6 Monate ab Vertragsschluss.

§ 4 Vertraulichkeit
(1) Der Berater behandelt alle ihm bekannt werdenden Informationen streng vertraulich.

§ 5 Haftung
(1) Die Haftung ist auf Vorsatz und grobe Fahrlässigkeit beschränkt.
`,
  },
};

// Erkennt den Vertragstyp aus dem Beschreibungstext → passendes Demo-Beispiel.
function pickDemo(userText: string): { title: string; text: string } {
  const t = (userText || "").toLowerCase();
  if (/\bnda\b|geheim|vertraulich|verschwiegen/.test(t)) return DEMO_CONTRACTS.nda;
  if (/miet|wohnung|vermiet|wohnraum/.test(t)) return DEMO_CONTRACTS.miete;
  if (/arbeitsvertrag|anstellung|arbeitnehmer|gehalt|angestellt/.test(t)) return DEMO_CONTRACTS.arbeit;
  if (/berat/.test(t)) return DEMO_CONTRACTS.berater;
  if (/kauf|verkauf|erwerb|kaufvertrag/.test(t)) return DEMO_CONTRACTS.kauf;
  return DEMO_CONTRACTS.freelancer; // Default (auch Freelancer/Dienstleistung)
}

export default function PremiumChat({ onClose, demo = false, initialPrompt = "", autoSend = false }: { onClose: () => void; demo?: boolean; initialPrompt?: string; autoSend?: boolean }) {
  const { user } = useAuth();
  const firstName = (user?.name || "").trim().split(/\s+/)[0] || "";
  const greeting = `Hi${firstName ? " " + firstName : ""}! Beschreib mir einfach in eigenen Worten, welchen Vertrag du brauchst — Stichworte reichen völlig.`;
  const [messages, setMessages] = useState<ChatMsg[]>([
    { role: "assistant", kind: "text", uiOnly: true, content: greeting },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [contract, setContract] = useState<ChatMsg["contract"] | null>(null);
  const [sigModal, setSigModal] = useState<{ contractId: string; contractName: string; s3Key: string } | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [messages, busy]);

  // Vorbefüllung aus dem Generate-Formular: autoSend=true (Free klickte „Erstellen" → direkt
  // generieren) ODER nur vorbefüllen (Nutzer kann ergänzen, dann senden).
  useEffect(() => {
    if (initialPrompt && initialPrompt.trim()) {
      if (autoSend) handleSend(initialPrompt);
      else setInput(initialPrompt);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toApi = (msgs: ChatMsg[]) =>
    msgs.filter((m) => !m.uiOnly && m.kind !== "generating").map((m) => ({ role: m.role, content: m.content }));

  async function postJson(url: string, body: any) {
    const res = await fetch(url, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.success === false) {
      const err: any = new Error(data.message || "Fehler"); err.data = data; err.status = res.status; throw err;
    }
    return data;
  }

  async function handleSend(override?: string, displayOverride?: string) {
    const text = (typeof override === "string" ? override : input).trim();
    if (!text || busy) return;
    if (demo) {
      // 🔓 Free-Tease: Free durchläuft DENSELBEN Prozess wie Zahler (beschreiben → Rückfragen
      // beantworten → Vertrag wird live geschrieben). Die Sperre kommt erst am FERTIGEN Vertrag
      // — so investiert sich der/die Nutzer:in erst und sieht den Wert (bessere Conversion).
      setInput("");
      const base = [...messages, { role: "user", kind: "text", content: text } as ChatMsg];
      setMessages(base);
      setBusy(true);
      setMessages((m) => [...m, { role: "assistant", kind: "generating", content: "" }]);
      try {
        if (!contract) {
          // Phase 1: bewerten — Rückfragen ODER (wenn genug Infos) gated generieren
          const a = await postJson("/api/contracts/premium/chat", { messages: toApi(base) });
          if (a.ready) {
            await streamGenerate(base, a.contractType, undefined, true); // free=true → Ergebnis gesperrt
          } else {
            setMessages((m) => [...m.filter((x) => x.kind !== "generating" && x.kind !== "streaming"),
              { role: "assistant", kind: "questions", content: "Rückfragen: " + a.questions.map((q: any) => q.frage).join(" "), questions: a.questions, contractType: a.contractType }]);
          }
        } else {
          // Phase 2: Verfeinern — denselben Vertrag (bleibt gated)
          await streamGenerate(base, contract.contractType, contract.contractId, true);
        }
      } catch (e: any) {
        setMessages((m) => m.filter((x) => x.kind !== "generating" && x.kind !== "streaming"));
        if (e?.status === 403 || e?.data?.upgradeRequired || e?.data?.freeUsed) {
          // Gratis-Generierung aufgebraucht → Upsell-Karte
          setMessages((m) => [...m, { role: "assistant", kind: "demolock", uiOnly: true, content: "__used__" }]);
        } else {
          // Anderer Fehler (z.B. KI down) → als Fallback die kostenlose Beispiel-Demo zeigen
          await runDemo(text);
        }
      } finally {
        setBusy(false);
      }
      return;
    }
    const base = [...messages, { role: "user", kind: "text", content: text, display: displayOverride } as ChatMsg];
    setMessages(base);
    setInput("");
    setBusy(true);
    setMessages((m) => [...m, { role: "assistant", kind: "generating", content: "" }]);

    const finish = (msg: ChatMsg) => setMessages((m) => [...m.filter((x) => x.kind !== "generating" && x.kind !== "streaming"), msg]);

    try {
      if (!contract) {
        // Phase 1: bewerten — Rückfragen oder live schreiben
        const a = await postJson("/api/contracts/premium/chat", { messages: toApi(base) });
        if (a.ready) {
          await streamGenerate(base, a.contractType);
        } else {
          finish({ role: "assistant", kind: "questions", content: "Rückfragen: " + a.questions.map((q: any) => q.frage).join(" "), questions: a.questions, contractType: a.contractType });
        }
      } else {
        // Phase 2: Verfeinern — DENSELBEN Vertrag aktualisieren (keine Dubletten)
        await streamGenerate(base, contract.contractType, contract.contractId);
      }
    } catch (e: any) {
      const msg = e?.data?.limitReached
        ? "Du hast dein monatliches Limit erreicht. Bitte Plan upgraden."
        : "Da ist gerade etwas schiefgelaufen — bitte versuch es nochmal.";
      finish({ role: "assistant", kind: "text", content: msg });
      toast.info(msg);
    } finally {
      setBusy(false);
    }
  }

  // Streamt den Vertrag live (ndjson) und ersetzt am Ende durch die Vertrags-Karte
  async function streamGenerate(base: ChatMsg[], contractType: string, existingContractId?: string, free = false) {
    let acc = "";
    setMessages((m) => [...m.filter((x) => x.kind !== "generating" && x.kind !== "streaming"), { role: "assistant", kind: "streaming", content: "", uiOnly: true }]);
    const res = await fetch("/api/contracts/premium/generate-stream", {
      method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: toApi(base), contractType, existingContractId: existingContractId || null }),
    });
    if (!res.ok || !res.body) {
      const data = await res.json().catch(() => ({}));
      const e: any = new Error(data.message || "Fehler"); e.data = data; e.status = res.status; throw e;
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    let done: any = null;
    for (;;) {
      const { value, done: rdone } = await reader.read();
      if (rdone) break;
      buf += decoder.decode(value, { stream: true });
      let nl: number;
      while ((nl = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, nl).trim();
        buf = buf.slice(nl + 1);
        if (!line) continue;
        let evt: any;
        try { evt = JSON.parse(line); } catch { continue; }
        if (evt.type === "delta") {
          if (free) continue; // 🔒 Free bekommt keine Volltext-Deltas (Server sendet auch keine) — doppelt sicher
          acc += evt.text;
          setMessages((m) => m.map((x) => (x.kind === "streaming" ? { ...x, content: acc } : x)));
        } else if (evt.type === "done") {
          done = evt;
          if (free) {
            // 🔒 Free-Tease: KEIN Volltext (kommt nicht mehr vom Server) — nur Vorschau + Sperr-Karte
            // mit Einmal-Freischaltung (9,90 €). Volltext/Download/Rechts-Check erst nach Kauf/Abo.
            setMessages((m) => [...m.filter((x) => x.kind !== "streaming" && x.kind !== "generating"),
              { role: "assistant", kind: "demolock", uiOnly: true, content: evt.title || evt.contractType || "Vertrag", lockPreview: evt.previewText || "", lockContractId: evt.contractId || null },
            ]);
          } else {
            const c = { contractId: evt.contractId, contractText: evt.contractText, contractType: evt.contractType, title: evt.title };
            setContract(c);
            setMessages((m) => [...m.filter((x) => x.kind !== "streaming"), { role: "assistant", kind: "contract", content: evt.contractText, contract: c }]);
          }
        } else if (evt.type === "chat") {
          // Verfeinern-Gate: keine Vertragsänderung (Frage/Smalltalk) → freundliche Antwort, Vertrag bleibt bestehen
          done = evt;
          setMessages((m) => [...m.filter((x) => x.kind !== "streaming" && x.kind !== "generating"), { role: "assistant", kind: "text", content: evt.reply || "Ich helfe dir hier nur rund um deinen Vertrag." }]);
        } else if (evt.type === "events") {
          if (!free && evt.count > 0) {
            setMessages((m) => [...m, { role: "assistant", kind: "events", uiOnly: true, content: `${evt.count} Fristen`, calItems: Array.isArray(evt.items) ? evt.items : [] }]);
          }
        } else if (evt.type === "error") {
          throw new Error(evt.message || "Fehler");
        }
      }
    }
    if (!done) throw new Error("Stream unvollständig.");
  }

  // „Überspringen": ohne Antworten generieren — fehlende Fakten werden zu Ausfüllfeldern
  async function skipQuestions(contractType?: string) {
    if (busy) return;
    const directive = "Bitte erstelle den Vertrag jetzt mit den bereits genannten Angaben. Lass alle nicht ausdrücklich genannten konkreten Fakten als klar markierte Ausfüllfelder ('____') und erfinde nichts.";
    const base = [...messages, { role: "user", kind: "text", content: directive, display: "Überspringen — fehlende Angaben als Ausfüllfelder lassen" } as ChatMsg];
    setMessages(base);
    setBusy(true);
    try {
      await streamGenerate(base, contractType || "Vertrag", undefined, demo); // Free → Ergebnis gesperrt
    } catch (e: any) {
      setMessages((m) => m.filter((x) => x.kind !== "generating" && x.kind !== "streaming"));
      if (demo && (e?.status === 403 || e?.data?.upgradeRequired || e?.data?.freeUsed)) {
        // Free-Gratis-Generierung aufgebraucht → Upsell-Karte (statt Fehlertext)
        setMessages((m) => [...m, { role: "assistant", kind: "demolock", uiOnly: true, content: "__used__" }]);
      } else {
        const msg = e?.data?.limitReached ? "Du hast dein monatliches Limit erreicht. Bitte Plan upgraden." : "Da ist gerade etwas schiefgelaufen — bitte versuch es nochmal.";
        setMessages((m) => [...m, { role: "assistant", kind: "text", content: msg }]);
        toast.info(msg);
      }
    } finally {
      setBusy(false);
    }
  }

  // Free-Demo: Beispiel-Vertrag „tippen" lassen, dann Sperr-Karte (kein KI-Lauf)
  async function runDemo(userText: string) {
    if (busy) return;
    setBusy(true);
    const demo = pickDemo(userText); // passendes Beispiel je nach beschriebenem Typ
    setMessages((m) => [...m, { role: "user", kind: "text", content: userText }, { role: "assistant", kind: "streaming", content: "", uiOnly: true }]);
    const chunks = demo.text.match(/[\s\S]{1,28}/g) || [demo.text];
    let acc = "";
    for (const ch of chunks) {
      acc += ch;
      setMessages((m) => m.map((x) => (x.kind === "streaming" ? { ...x, content: acc } : x)));
      await new Promise((r) => setTimeout(r, 70));
    }
    setMessages((m) => [...m.filter((x) => x.kind !== "streaming"), { role: "assistant", kind: "demolock", uiOnly: true, content: demo.title }]);
    setBusy(false);
  }

  async function downloadPdf(c: NonNullable<ChatMsg["contract"]>, design: DesignCfg, signature?: string | null, logo?: string | null) {
    try {
      const res = await fetch("/api/contracts/premium/pdf", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contractId: c.contractId, design, signature: signature || null, logo: logo || null }) });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = (c.title || "Vertrag") + ".pdf"; a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error("PDF konnte nicht erstellt werden."); }
  }

  // Zur Unterschrift senden: Premium-PDF → S3 → bestehenden Envelope-Dialog öffnen
  async function sendForSignature(c: NonNullable<ChatMsg["contract"]>, design: DesignCfg, signature?: string | null, logo?: string | null) {
    const t = toast.loading("Vertrag wird für die Unterschrift vorbereitet …");
    try {
      const pdfRes = await fetch("/api/contracts/premium/pdf", {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contractId: c.contractId, design, signature: signature || null, logo: logo || null }),
      });
      if (!pdfRes.ok) throw new Error("PDF");
      const blob = await pdfRes.blob();
      const base64 = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onloadend = () => resolve((r.result as string).split(",")[1]);
        r.onerror = reject;
        r.readAsDataURL(blob);
      });
      const upRes = await fetch(`/api/contracts/${c.contractId}/upload-pdf`, {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pdfBase64: base64 }),
      });
      const upData = await upRes.json().catch(() => ({}));
      if (!upRes.ok || !upData.s3Key) throw new Error(upData.error || "Upload");
      toast.dismiss(t);
      setSigModal({ contractId: c.contractId, contractName: c.title || "Vertrag", s3Key: upData.s3Key });
    } catch {
      toast.dismiss(t);
      toast.error("Konnte den Vertrag nicht zur Unterschrift vorbereiten. Bitte erneut versuchen.");
    }
  }

  async function runReview(c: NonNullable<ChatMsg["contract"]>) {
    if (busy) return;
    setBusy(true);
    setMessages((m) => [...m, { role: "assistant", kind: "generating", content: "" }]);
    try {
      const r = await postJson("/api/contracts/premium/review", { contractId: c.contractId });
      setMessages((m) => [...m.filter((x) => x.kind !== "generating"), {
        role: "assistant", kind: "review", uiOnly: true, content: "Rechts-Check",
        review: { verdict: r.verdict, summary: r.summary, checks: r.checks || [], empfehlungen: r.empfehlungen || [] },
      }]);
    } catch {
      setMessages((m) => [...m.filter((x) => x.kind !== "generating"), { role: "assistant", kind: "text", content: "Der Rechts-Check ist gerade nicht möglich — bitte versuch es nochmal." }]);
    } finally {
      setBusy(false);
    }
  }

  async function runExplain(c: NonNullable<ChatMsg["contract"]>) {
    if (busy) return;
    setBusy(true);
    setMessages((m) => [...m, { role: "assistant", kind: "generating", content: "" }]);
    try {
      const r = await postJson("/api/contracts/premium/explain", { contractId: c.contractId });
      setMessages((m) => [...m.filter((x) => x.kind !== "generating"), {
        role: "assistant", kind: "explain", uiOnly: true, content: "Erklärung",
        explainData: { summary: r.summary, items: r.items || [] },
      }]);
    } catch {
      setMessages((m) => [...m.filter((x) => x.kind !== "generating"), { role: "assistant", kind: "text", content: "Die Erklärung ist gerade nicht möglich — bitte versuch es nochmal." }]);
    } finally {
      setBusy(false);
    }
  }

  function applyRecommendations(review: ReviewData) {
    if (busy || !review.empfehlungen.length) return;
    const text = "Bitte arbeite folgende Empfehlungen aus dem Rechts-Check in den Vertrag ein:\n" +
      review.empfehlungen.map((e, i) => `${i + 1}. ${e}`).join("\n");
    handleSend(text, "→ Empfehlungen aus dem Rechts-Check werden übernommen");
  }

  return (
    <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 18, boxShadow: "0 1px 2px rgba(16,30,60,.04), 0 24px 60px -24px rgba(16,30,60,.22)", overflow: "hidden", display: "flex", flexDirection: "column", height: "78vh", minHeight: 560, maxWidth: 820, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "16px 20px", borderBottom: `1px solid ${C.border}` }}>
        <button onClick={onClose} title="Zurück" style={{ border: "none", background: "transparent", cursor: "pointer", color: C.muted, display: "flex", padding: 4 }}><ArrowLeft size={20} /></button>
        <div style={{ width: 34, height: 34, borderRadius: "50%", background: `linear-gradient(135deg,${C.blue},${C.blue2})`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", flex: "none" }}><Sparkles size={18} /></div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>Vertrag erstellen</div>
          <div style={{ fontSize: 12, color: C.muted }}>KI-Assistent · schreibt einen vollständigen Vertrag für dich</div>
        </div>
        <span style={{ marginLeft: "auto", fontSize: 10.5, fontWeight: 700, letterSpacing: ".04em", color: C.blue, background: "rgba(46,108,246,.10)", padding: "4px 9px", borderRadius: 7 }}>PREMIUM</span>
      </div>

      {/* Chat */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", background: C.bg, padding: "22px 20px", display: "flex", flexDirection: "column", gap: 16 }}>
        {messages.map((m, i) => (
          <Bubble key={i} m={m} onDownload={downloadPdf} onReview={runReview} onExplain={runExplain} onApplyRec={applyRecommendations} onSkip={skipQuestions} onSend={sendForSignature} busy={busy} />
        ))}
        {messages.length === 1 && !busy && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, paddingLeft: 41, marginTop: -4 }}>
            <span style={{ width: "100%", fontSize: 12, color: C.muted2, marginBottom: 2 }}>Oder schnell starten:</span>
            {QUICK_STARTS.map((q) => (
              <button key={q.label} type="button" onClick={() => handleSend(q.prompt)}
                style={{ display: "inline-flex", alignItems: "center", gap: 6, font: "inherit", fontSize: 13, fontWeight: 600, cursor: "pointer", borderRadius: 999, padding: "7px 13px", border: `1px solid ${C.border}`, background: "#fff", color: "#33415c" }}>
                <span>{q.emoji}</span> {q.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Input */}
      <div style={{ padding: "14px 16px", borderTop: `1px solid ${C.border}`, background: "#fff" }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 9, border: `1.5px solid ${C.border}`, borderRadius: 14, padding: "8px 8px 8px 14px", background: "#fff" }}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder={contract ? "Änderungswunsch … z. B. „Laufzeit auf 6 Monate“" : "Beschreibe deinen Vertrag … (Stichworte reichen)"}
            rows={1}
            disabled={busy}
            style={{ flex: 1, resize: "none", border: "none", outline: "none", font: "inherit", fontSize: 14, color: C.ink, padding: "6px 0", maxHeight: 120, background: "transparent" }}
          />
          <button onClick={() => handleSend()} disabled={busy || !input.trim()} title="Senden"
            style={{ width: 38, height: 38, borderRadius: 10, border: "none", background: busy || !input.trim() ? "#c7d4ee" : `linear-gradient(135deg,${C.blue},${C.blue2})`, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: busy || !input.trim() ? "default" : "pointer", flex: "none" }}>
            <Send size={18} />
          </button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "center", color: C.muted2, fontSize: 11, marginTop: 9 }}>
          <Lock size={13} /> Kein Ersatz für Rechtsberatung · deine Eingaben bleiben vertraulich
        </div>
      </div>

      {sigModal && (
        <EnhancedSignatureModal
          show={true}
          onClose={() => setSigModal(null)}
          contractId={sigModal.contractId}
          contractName={sigModal.contractName}
          contractS3Key={sigModal.s3Key}
        />
      )}
    </div>
  );
}

function Bubble({ m, onDownload, onReview, onExplain, onApplyRec, onSkip, onSend, busy }: { m: ChatMsg; onDownload: (c: NonNullable<ChatMsg["contract"]>, design: DesignCfg, signature?: string | null, logo?: string | null) => void; onReview: (c: NonNullable<ChatMsg["contract"]>) => void; onExplain: (c: NonNullable<ChatMsg["contract"]>) => void; onApplyRec: (r: ReviewData) => void; onSkip: (contractType?: string) => void; onSend: (c: NonNullable<ChatMsg["contract"]>, design: DesignCfg, signature?: string | null, logo?: string | null) => void; busy: boolean }) {
  const isUser = m.role === "user";
  const AiAvatar = (
    <div style={{ width: 30, height: 30, borderRadius: "50%", background: `linear-gradient(135deg,${C.blue},${C.blue2})`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", flex: "none" }}><Sparkles size={16} /></div>
  );

  if (m.kind === "generating") {
    return (
      <div style={{ display: "flex", gap: 11 }}>
        {AiAvatar}
        <div style={{ padding: "12px 15px", borderRadius: 14, borderTopLeftRadius: 4, background: "#fff", border: `1px solid ${C.border}`, color: C.muted, fontSize: 14, display: "flex", alignItems: "center", gap: 9 }}>
          <Dots /> schreibt …
        </div>
      </div>
    );
  }

  const bubbleStyle: CSSProperties = {
    padding: "12px 15px", borderRadius: 14, fontSize: 14, lineHeight: 1.55, maxWidth: "80%",
    ...(isUser
      ? { background: `linear-gradient(135deg,${C.blue},${C.blue2})`, color: "#fff", borderTopRightRadius: 4 }
      : { background: "#fff", border: `1px solid ${C.border}`, color: C.ink, borderTopLeftRadius: 4 }),
  };

  return (
    <div style={{ display: "flex", gap: 11, justifyContent: isUser ? "flex-end" : "flex-start" }}>
      {!isUser && AiAvatar}
      {m.kind === "streaming" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: "88%" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 13, color: C.muted }}><Dots /> schreibt deinen Vertrag …</div>
          <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 14, borderTopLeftRadius: 4, padding: "14px 16px", fontFamily: "Georgia,'Times New Roman',serif", fontSize: 12.5, color: "#43506a", lineHeight: 1.55, whiteSpace: "pre-wrap" }}>
            {m.content || "…"}<span style={{ color: C.blue, fontWeight: 700 }}>▍</span>
          </div>
        </div>
      ) : m.kind === "questions" ? (
        <div style={bubbleStyle}>
          Damit der Vertrag wirklich passt, brauche ich noch ein paar Angaben:
          <div style={{ marginTop: 8 }}>
            {m.questions!.map((q, i) => (
              <div key={q.id || i} style={{ display: "flex", gap: 9, marginTop: 9, alignItems: "flex-start" }}>
                <span style={{ width: 19, height: 19, borderRadius: "50%", background: C.track, color: "#41506b", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flex: "none", marginTop: 1 }}>{i + 1}</span>
                <span style={{ fontSize: 13.5 }}>{q.frage}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 13, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, color: C.muted2 }}>Antworte einfach unten — oder:</span>
            <button type="button" disabled={busy} onClick={() => onSkip(m.contractType)}
              style={{ font: "inherit", fontSize: 12.5, fontWeight: 600, cursor: busy ? "default" : "pointer", borderRadius: 8, padding: "6px 12px", border: `1px solid ${C.border}`, background: "#fff", color: "#41506b", opacity: busy ? 0.6 : 1 }}>
              Überspringen → Ausfüllfelder
            </button>
          </div>
        </div>
      ) : m.kind === "contract" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: "88%" }}>
          <div style={bubbleStyle}>Fertig — hier ist dein Vertrag:</div>
          <ContractCard c={m.contract!} onDownload={onDownload} onReview={onReview} onExplain={onExplain} onSend={onSend} />
          <div style={{ ...bubbleStyle, maxWidth: "100%", fontSize: 13, color: "#41506b" }}>
            Du kannst unten weiter mit mir chatten, um Klauseln zu ändern — z. B. „Laufzeit auf 6 Monate“ oder „Wettbewerbsverbot ergänzen“.
          </div>
        </div>
      ) : m.kind === "review" ? (
        <ReviewCard review={m.review!} onApply={() => onApplyRec(m.review!)} />
      ) : m.kind === "events" ? (
        <EventsCard items={m.calItems || []} />
      ) : m.kind === "explain" ? (
        <ExplainCard explain={m.explainData!} />
      ) : m.kind === "demolock" ? (
        <LockCard title={m.content === "__used__" ? undefined : m.content} used={m.content === "__used__"} preview={m.lockPreview} contractId={m.lockContractId} />
      ) : (
        <div style={bubbleStyle}>{m.display ?? m.content}</div>
      )}
    </div>
  );
}

function ContractCard({ c, onDownload, onReview, onExplain, onSend }: { c: NonNullable<ChatMsg["contract"]>; onDownload: (c: NonNullable<ChatMsg["contract"]>, design: DesignCfg, signature?: string | null, logo?: string | null) => void; onReview: (c: NonNullable<ChatMsg["contract"]>) => void; onExplain: (c: NonNullable<ChatMsg["contract"]>) => void; onSend: (c: NonNullable<ChatMsg["contract"]>, design: DesignCfg, signature?: string | null, logo?: string | null) => void }) {
  const [design, setDesign] = useState<string | { style: string; accent: string }>("royal");
  const [signature, setSignature] = useState<string | null>(null);
  const [showPad, setShowPad] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [designOpen, setDesignOpen] = useState(false);
  const [logo, setLogo] = useState<string | null>(null);
  const lines = c.contractText.split("\n").filter((l) => l.trim()).slice(0, 8);
  const sectionCount = (c.contractText.match(/^§\s*\d/gm) || []).length;
  const designs = [
    { id: "royal", label: "Royal" },
    { id: "gold", label: "Gold" },
    { id: "klassisch", label: "Klassisch" },
    { id: "elegant", label: "Elegant" },
    { id: "modern", label: "Modern" },
  ];
  const accent = typeof design === "object" ? design.accent : design === "gold" ? "#c9a961" : design === "royal" ? "#1e3a8a" : design === "modern" ? "#0ea5e9" : "#1f4e8c";
  const isCustom = typeof design === "object";
  const [customStyle, setCustomStyle] = useState("executive");
  const currentStyle = typeof design === "object" ? design.style : customStyle;
  const styleLabel = (s: string) => (s === "executive" ? "Executive" : s === "kanzlei" ? "Kanzlei" : s === "modern" ? "Modern" : s === "minimal" ? "Minimal" : s);
  const currentLabel = isCustom ? `${styleLabel(currentStyle)} · eigene Farbe` : (designs.find((d) => d.id === design)?.label || "Royal");
  const swatchColor = (id: string) => (id === "gold" ? "#c9a961" : id === "royal" ? "#1e3a8a" : id === "modern" ? "#0ea5e9" : id === "elegant" ? "#1a2230" : "#1f4e8c");
  const onLogoFile = (e: any) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    if (f.size > 500 * 1024) { toast.info("Logo bitte unter 500 KB (PNG/JPG)."); return; }
    const r = new FileReader();
    r.onload = () => setLogo(typeof r.result === "string" ? r.result : null);
    r.readAsDataURL(f);
  };
  // Live-Vorschau: bei offener Vorschau + Design-/Farbwechsel debounced das echte PDF holen
  useEffect(() => {
    if (!previewOpen) return;
    let cancelled = false;
    setPreviewLoading(true);
    const h = setTimeout(async () => {
      try {
        const res = await fetch("/api/contracts/premium/pdf", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contractId: c.contractId, design, signature: signature || null, logo: logo || null }) });
        if (!res.ok) throw new Error();
        const blob = await res.blob();
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        setPreviewUrl((old) => { if (old) URL.revokeObjectURL(old); return url; });
      } catch { /* ignore */ }
      finally { if (!cancelled) setPreviewLoading(false); }
    }, 400);
    return () => { cancelled = true; clearTimeout(h); };
  }, [previewOpen, design, signature, logo, c.contractId]);
  return (
    <div style={{ border: `1px solid ${C.border}`, borderRadius: 14, overflow: "hidden", background: "#fff", maxWidth: 460 }}>
      {previewOpen ? (
        <div style={{ position: "relative", height: 440, background: "#eef1f6", borderBottom: `1px solid ${C.border}` }}>
          {previewUrl ? (
            <iframe title="Live-Vorschau" src={previewUrl + "#toolbar=0&navpanes=0&view=FitH"} style={{ width: "100%", height: "100%", border: 0 }} />
          ) : (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: C.muted, fontSize: 13, gap: 9 }}><Dots /> Vorschau wird erstellt …</div>
          )}
          {previewLoading && previewUrl && <div style={{ position: "absolute", top: 8, right: 10, fontSize: 11, fontWeight: 600, color: C.muted, background: "rgba(255,255,255,.85)", padding: "3px 9px", borderRadius: 6, boxShadow: "0 1px 3px rgba(0,0,0,.08)" }}>aktualisiert …</div>}
        </div>
      ) : (
        <div style={{ padding: "16px 18px", background: "linear-gradient(180deg,#fff,#fcfdff)", fontFamily: design === "elegant" ? "Georgia,'Times New Roman',serif" : "'Inter',sans-serif", borderBottom: `1px solid ${C.border}`, maxHeight: 190, overflow: "hidden", position: "relative" }}>
        {lines.map((l, i) => {
          const isPar = /^§\s*\d/.test(l.trim());
          const isHead = i === 0;
          return (
            <div key={i} style={{ fontSize: isHead ? 13 : 11, fontWeight: isHead || isPar ? 700 : 400, color: isPar ? accent : "#43506a", textAlign: isHead ? "center" : "left", margin: isHead ? "0 0 9px" : isPar ? "8px 0 2px" : "2px 0", lineHeight: 1.5 }}>{l.trim()}</div>
          );
        })}
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 40, background: "linear-gradient(180deg,rgba(255,255,255,0),#fff)" }} />
        </div>
      )}
      {/* Design & Vorschau — kompakt, aufklappbar, horizontal scrollbar */}
      <div style={{ padding: "12px 15px 2px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button type="button" onClick={() => setDesignOpen((o) => !o)} style={{ flex: 1, minWidth: 0, display: "inline-flex", alignItems: "center", gap: 7, font: "inherit", fontSize: 12.5, fontWeight: 600, cursor: "pointer", borderRadius: 8, padding: "7px 11px", border: `1px solid ${designOpen ? C.blue : C.border}`, background: designOpen ? "rgba(46,108,246,.06)" : "#fff", color: "#33415c", textAlign: "left" }}>
            <Palette size={14} color={accent} />
            <span style={{ flex: "none" }}>Design</span>
            <span style={{ width: 11, height: 11, borderRadius: "50%", background: accent, border: "1px solid rgba(0,0,0,.18)", flex: "none" }} />
            <span style={{ color: C.muted2, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{currentLabel}{logo ? " · Logo" : ""}</span>
            <ChevronDown size={15} color={C.muted} style={{ marginLeft: "auto", flex: "none", transform: designOpen ? "rotate(180deg)" : "none", transition: "transform .15s" }} />
          </button>
          <button type="button" onClick={() => setPreviewOpen((o) => !o)} title="Echte PDF-Vorschau ein-/ausblenden" style={{ display: "inline-flex", alignItems: "center", gap: 6, font: "inherit", fontSize: 12.5, fontWeight: 600, cursor: "pointer", borderRadius: 8, padding: "7px 11px", border: `1px solid ${previewOpen ? C.blue : C.border}`, background: previewOpen ? "rgba(46,108,246,.08)" : "#fff", color: previewOpen ? C.blue : "#41506b", flex: "none" }}>
            <Eye size={14} /> {previewOpen ? "Aus" : "Vorschau"}
          </button>
        </div>
        {designOpen && (
          <>
          <div style={{ display: "flex", alignItems: "center", gap: 8, paddingTop: 10, flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, color: C.muted, fontWeight: 600 }}>Stil:</span>
            <select value={currentStyle} onChange={(e) => { const st = e.target.value; setCustomStyle(st); setDesign({ style: st, accent }); }}
              style={{ font: "inherit", fontSize: 12.5, fontWeight: 600, color: "#33415c", borderRadius: 8, padding: "5px 9px", border: `1px solid ${C.border}`, background: "#fff", cursor: "pointer" }}>
              <option value="executive">Executive (Kopfband)</option>
              <option value="kanzlei">Kanzlei (Serif, klassisch)</option>
              <option value="modern">Modern (Akzentbalken)</option>
              <option value="minimal">Minimal (reduziert)</option>
            </select>
            <span style={{ fontSize: 11, color: C.muted2 }}>+ Farbe & Logo unten</span>
          </div>
          <div style={{ display: "flex", gap: 7, overflowX: "auto", paddingTop: 9, paddingBottom: 4 }}>
            {designs.map((dd) => {
              const active = design === dd.id;
              return (
                <button key={dd.id} type="button" onClick={() => setDesign(dd.id)} style={{ flex: "none", display: "inline-flex", alignItems: "center", gap: 6, font: "inherit", fontSize: 12, fontWeight: 600, cursor: "pointer", borderRadius: 8, padding: "6px 11px", border: `1px solid ${active ? C.blue : C.border}`, background: active ? "rgba(46,108,246,.08)" : "#fff", color: active ? C.blue : "#41506b", whiteSpace: "nowrap" }}>
                  <span style={{ width: 11, height: 11, borderRadius: "50%", background: swatchColor(dd.id), border: "1px solid rgba(0,0,0,.18)", flex: "none" }} />
                  {dd.label}
                </button>
              );
            })}
            <label title="Eigene Akzentfarbe wählen" style={{ flex: "none", display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", borderRadius: 8, padding: "6px 11px", border: `1px solid ${isCustom ? C.blue : C.border}`, background: isCustom ? "rgba(46,108,246,.08)" : "#fff", color: isCustom ? C.blue : "#41506b", position: "relative", whiteSpace: "nowrap" }}>
              <span style={{ width: 11, height: 11, borderRadius: "50%", background: isCustom ? accent : "conic-gradient(from 0deg,#ef4444,#f59e0b,#10b981,#3b82f6,#a855f7,#ef4444)", border: "1px solid rgba(0,0,0,.18)", flex: "none" }} />
              Eigene Farbe
              <input type="color" value={accent} onChange={(e) => setDesign({ style: customStyle, accent: e.target.value })} style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }} />
            </label>
            <label title="Eigenes Logo hochladen (PNG/JPG, max. 500 KB)" style={{ flex: "none", display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", borderRadius: 8, padding: "6px 11px", border: `1px solid ${logo ? C.blue : C.border}`, background: logo ? "rgba(46,108,246,.08)" : "#fff", color: logo ? C.blue : "#41506b", position: "relative", whiteSpace: "nowrap" }}>
              <ImageIcon size={13} /> {logo ? "Logo ✓" : "Logo"}
              <input type="file" accept="image/png,image/jpeg" onChange={onLogoFile} style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer", width: "100%" }} />
            </label>
            {logo && (
              <button type="button" onClick={() => setLogo(null)} style={{ flex: "none", font: "inherit", fontSize: 12, color: C.muted, background: "none", border: "none", cursor: "pointer", textDecoration: "underline", whiteSpace: "nowrap" }}>Logo entfernen</button>
            )}
          </div>
          </>
        )}
      </div>
      {/* Unterschrift direkt auf den Vertrag */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 15px 0", flexWrap: "wrap" }}>
        <span style={{ fontSize: 12, color: C.muted, fontWeight: 600 }}>Unterschrift:</span>
        {signature ? (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "#0a8a4a", fontWeight: 600 }}>
            <Check size={14} /> unterschrieben
            <button type="button" onClick={() => setShowPad(true)} style={{ font: "inherit", fontSize: 12, color: C.blue, background: "none", border: "none", cursor: "pointer", textDecoration: "underline", padding: 0, marginLeft: 4 }}>neu</button>
            <button type="button" onClick={() => setSignature(null)} style={{ font: "inherit", fontSize: 12, color: C.muted, background: "none", border: "none", cursor: "pointer", textDecoration: "underline", padding: 0 }}>entfernen</button>
          </span>
        ) : (
          <button type="button" onClick={() => setShowPad(true)} style={{ display: "inline-flex", alignItems: "center", gap: 6, font: "inherit", fontSize: 12.5, fontWeight: 600, cursor: "pointer", borderRadius: 8, padding: "5px 11px", border: `1px solid ${C.border}`, background: "#fff", color: "#41506b" }}>
            <PenLine size={14} /> Unterschreiben
          </button>
        )}
      </div>
      {showPad && <SignaturePad onSave={(d) => { setSignature(d); setShowPad(false); }} onCancel={() => setShowPad(false)} />}

      <div style={{ display: "flex", gap: 9, padding: "12px 15px 14px", alignItems: "center", flexWrap: "wrap" }}>
        <button onClick={() => onDownload(c, design, signature, logo)} style={{ display: "inline-flex", alignItems: "center", gap: 7, font: "inherit", fontWeight: 600, fontSize: 13, borderRadius: 10, padding: "9px 14px", cursor: "pointer", border: "none", color: "#fff", background: `linear-gradient(135deg,${C.blue},${C.blue2})`, boxShadow: "0 6px 14px -4px rgba(46,108,246,.45)" }}>
          <Download size={16} /> PDF herunterladen
        </button>
        <button onClick={() => onSend(c, design, signature, logo)} title="Vertrag an die andere Partei zum Unterschreiben senden" style={{ display: "inline-flex", alignItems: "center", gap: 6, font: "inherit", fontWeight: 600, fontSize: 13, borderRadius: 10, padding: "9px 13px", cursor: "pointer", border: `1px solid ${C.border}`, background: "#fff", color: "#33415c" }}>
          <Send size={15} /> Zur Unterschrift senden
        </button>
        <button onClick={() => onReview(c)} title="Vertrag von der KI auf Rechtssicherheit prüfen lassen" style={{ display: "inline-flex", alignItems: "center", gap: 6, font: "inherit", fontWeight: 600, fontSize: 13, borderRadius: 10, padding: "9px 13px", cursor: "pointer", border: `1px solid ${C.border}`, background: "#fff", color: "#33415c" }}>
          <ShieldCheck size={15} /> Rechts-Check
        </button>
        <button onClick={() => onExplain(c)} title="Jede Klausel in einfachen Worten erklären lassen" style={{ display: "inline-flex", alignItems: "center", gap: 6, font: "inherit", fontWeight: 600, fontSize: 13, borderRadius: 10, padding: "9px 13px", cursor: "pointer", border: `1px solid ${C.border}`, background: "#fff", color: "#33415c" }}>
          <BookOpen size={15} /> Erklären
        </button>
        <span style={{ marginLeft: "auto", fontSize: 11, color: C.muted2, display: "flex", alignItems: "center", gap: 5 }}>{sectionCount || ""} §§ · gespeichert</span>
      </div>
    </div>
  );
}

function ReviewCard({ review, onApply }: { review: ReviewData; onApply: () => void }) {
  const v = review.verdict;
  const theme = v === "gut"
    ? { bg: "rgba(10,138,74,.08)", border: "#bfe6cf", color: "#0a8a4a", label: "Rechts-Check bestanden" }
    : v === "mit_empfehlungen"
    ? { bg: "rgba(184,134,11,.08)", border: "#f0dcb0", color: "#b8860b", label: "Gut — mit Empfehlungen" }
    : { bg: "rgba(192,57,43,.07)", border: "#f0c4c4", color: "#c0392b", label: "Lücken gefunden" };
  const icon = (status: string) =>
    status === "vorhanden" ? <Check size={14} color="#0a8a4a" /> : status === "schwach" ? <AlertTriangle size={14} color="#b8860b" /> : <X size={14} color="#c0392b" />;
  const okCount = review.checks.filter((c) => c.status === "vorhanden").length;
  return (
    <div style={{ display: "flex", gap: 11, maxWidth: "90%" }}>
      <div style={{ width: 30, height: 30, borderRadius: "50%", background: `linear-gradient(135deg,${C.blue},${C.blue2})`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", flex: "none" }}><ShieldCheck size={16} /></div>
      <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 14, borderTopLeftRadius: 4, overflow: "hidden", flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "11px 15px", background: theme.bg, borderBottom: `1px solid ${theme.border}` }}>
          <ShieldCheck size={16} color={theme.color} />
          <span style={{ fontWeight: 700, fontSize: 14, color: theme.color }}>{theme.label}</span>
          <span style={{ marginLeft: "auto", fontSize: 11.5, color: C.muted, fontWeight: 600 }}>{okCount}/{review.checks.length} ok</span>
        </div>
        <div style={{ padding: "12px 15px" }}>
          <div style={{ fontSize: 13, color: "#41506b", marginBottom: 11, lineHeight: 1.5 }}>{review.summary}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {review.checks.map((ch, i) => (
              <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                <span style={{ marginTop: 1, flex: "none" }}>{icon(ch.status)}</span>
                <span style={{ fontSize: 12.5, color: C.ink, lineHeight: 1.45 }}><b style={{ fontWeight: 600 }}>{ch.klausel}</b><span style={{ color: C.muted }}> — {ch.hinweis}</span></span>
              </div>
            ))}
          </div>
          {review.empfehlungen.length > 0 && (
            <button onClick={onApply} style={{ marginTop: 13, display: "inline-flex", alignItems: "center", gap: 7, font: "inherit", fontWeight: 600, fontSize: 13, borderRadius: 10, padding: "9px 14px", cursor: "pointer", border: "none", color: "#fff", background: `linear-gradient(135deg,${C.blue},${C.blue2})` }}>
              <Sparkles size={15} /> Empfehlungen übernehmen
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function EventsCard({ items }: { items: CalItem[] }) {
  const [open, setOpen] = useState(false);
  const fmt = (d: string) => { try { return new Date(d).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" }); } catch { return d; } };
  const sevColor = (s?: string) => (s === "critical" ? "#c0392b" : s === "warning" ? "#b8860b" : "#2E6CF6");
  return (
    <div style={{ display: "flex", gap: 11, maxWidth: "90%" }}>
      <div style={{ width: 30, height: 30, borderRadius: "50%", background: `linear-gradient(135deg,${C.blue},${C.blue2})`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", flex: "none" }}><Bell size={15} /></div>
      <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 14, borderTopLeftRadius: 4, overflow: "hidden", flex: 1 }}>
        <button type="button" onClick={() => setOpen((o) => !o)} style={{ width: "100%", textAlign: "left", display: "flex", alignItems: "center", gap: 9, padding: "12px 15px", background: "rgba(46,108,246,.06)", border: "none", cursor: "pointer", font: "inherit" }}>
          <Calendar size={16} color={C.blue} />
          <span style={{ fontWeight: 700, fontSize: 14, color: "#1f4e8c" }}>{items.length} {items.length === 1 ? "Frist" : "Fristen"} im Kalender</span>
          <span style={{ fontSize: 12, color: C.muted, fontWeight: 500 }}>· du wirst erinnert</span>
          <ChevronDown size={16} color={C.muted} style={{ marginLeft: "auto", transform: open ? "rotate(180deg)" : "none", transition: "transform .15s" }} />
        </button>
        {open && (
          <div style={{ padding: "10px 15px 13px", display: "flex", flexDirection: "column", gap: 9 }}>
            {items.length === 0 ? (
              <span style={{ fontSize: 12.5, color: C.muted }}>Keine Termine.</span>
            ) : items.map((it, i) => (
              <div key={i} style={{ display: "flex", gap: 9, alignItems: "flex-start" }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: sevColor(it.severity), flex: "none", marginTop: 5 }} />
                <span style={{ fontSize: 12.5, color: C.ink, lineHeight: 1.45, flex: 1 }}>{it.title}</span>
                <span style={{ fontSize: 12, color: C.muted, fontWeight: 600, flex: "none", whiteSpace: "nowrap" }}>{fmt(it.date)}</span>
              </div>
            ))}
            <div style={{ fontSize: 11, color: C.muted2, marginTop: 4 }}>Alle Termine findest du auch in deinem Kalender.</div>
          </div>
        )}
      </div>
    </div>
  );
}

function ExplainCard({ explain }: { explain: ExplainData }) {
  const [open, setOpen] = useState(true);
  return (
    <div style={{ display: "flex", gap: 11, maxWidth: "90%" }}>
      <div style={{ width: 30, height: 30, borderRadius: "50%", background: `linear-gradient(135deg,${C.blue},${C.blue2})`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", flex: "none" }}><BookOpen size={15} /></div>
      <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 14, borderTopLeftRadius: 4, overflow: "hidden", flex: 1 }}>
        <button type="button" onClick={() => setOpen((o) => !o)} style={{ width: "100%", textAlign: "left", display: "flex", alignItems: "center", gap: 9, padding: "12px 15px", background: "rgba(46,108,246,.06)", border: "none", cursor: "pointer", font: "inherit" }}>
          <BookOpen size={16} color={C.blue} />
          <span style={{ fontWeight: 700, fontSize: 14, color: "#1f4e8c" }}>Verständlich erklärt</span>
          <ChevronDown size={16} color={C.muted} style={{ marginLeft: "auto", transform: open ? "rotate(180deg)" : "none", transition: "transform .15s" }} />
        </button>
        {open && (
          <div style={{ padding: "12px 15px" }}>
            <div style={{ fontSize: 13, color: "#41506b", marginBottom: 12, lineHeight: 1.5 }}>{explain.summary}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {explain.items.map((it, i) => (
                <div key={i}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.ink, marginBottom: 2 }}>{it.titel}</div>
                  <div style={{ fontSize: 12.5, color: "#41506b", lineHeight: 1.5 }}>{it.erklaerung}</div>
                  {it.rechtsgrundlage && it.rechtsgrundlage !== "–" && (
                    <div style={{ fontSize: 11.5, color: C.blue, fontWeight: 600, marginTop: 3 }}>{it.rechtsgrundlage}</div>
                  )}
                </div>
              ))}
            </div>
            <div style={{ fontSize: 11, color: C.muted2, marginTop: 12 }}>Erläuterung zur Orientierung – keine Rechtsberatung.</div>
          </div>
        )}
      </div>
    </div>
  );
}

function LockCard({ title, used = false, preview, contractId }: { title?: string; used?: boolean; preview?: string; contractId?: string | null }) {
  // Optik bewusst an die Analyse-Sperre (LockedAnalysisUpsell) angeglichen.
  // used=true → die kostenlose Probe-Generierung ist aufgebraucht (kein konkreter Vertrag zum Freikaufen).
  // contractId vorhanden → Einmal-Freischaltung (9,90 €) DIESES Vertrags möglich.
  const vertragLabel = used
    ? "Kostenlose Generierungen aufgebraucht"
    : (title && title !== "lock" ? `Dein ${title} ist fertig!` : "Dein Vertrag ist fertig!");
  const canUnlock = !used && !!contractId;
  return (
    <div style={{ display: "flex", gap: 11, maxWidth: "90%" }}>
      <div style={{ width: 30, height: 30, borderRadius: "50%", background: `linear-gradient(135deg,${C.blue},${C.blue2})`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", flex: "none" }}><Lock size={15} /></div>
      <div style={{ border: `1.5px solid #d6e2fb`, borderRadius: 14, borderTopLeftRadius: 4, overflow: "hidden", flex: 1, background: "linear-gradient(135deg, rgba(46,108,246,.06), rgba(30,83,216,.03))" }}>
        {/* 🔒 Geblurrte Vorschau — vermittelt „der echte Vertrag steht dahinter" (Volltext ist NICHT im DOM) */}
        {canUnlock && preview ? (
          <div style={{ filter: "blur(4px)", opacity: 0.55, padding: "14px 18px 0", whiteSpace: "pre-wrap", fontFamily: "Georgia,'Times New Roman',serif", fontSize: 11.5, lineHeight: 1.5, color: "#43506a", maxHeight: 116, overflow: "hidden", userSelect: "none", pointerEvents: "none" }}>
            {preview}
          </div>
        ) : null}
        <div style={{ padding: "18px 18px 16px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
          {/* quadratisches Schloss-Badge wie bei der Analyse-Sperre */}
          <div style={{ width: 48, height: 48, borderRadius: 13, display: "grid", placeItems: "center", background: "linear-gradient(135deg,#eff4ff 0%,#e0e9fb 100%)", color: "#2563eb", marginBottom: 12, boxShadow: "0 1px 2px rgba(37,99,235,.12)" }}><Lock size={20} /></div>
          <div style={{ fontWeight: 700, fontSize: 17, color: "#0f172a", marginBottom: 6 }}>{vertragLabel}</div>
          <div style={{ fontSize: 13.5, color: "#334155", lineHeight: 1.55, marginBottom: 16, maxWidth: 360 }}>
            {used ? (
              <>Du hast deine <b>kostenlosen Vertrags-Generierungen</b> aufgebraucht. Schalte frei, um <b>unbegrenzt Verträge zu erstellen</b> — inkl. PDF, Rechts-Check, Klausel-Erklärung, Fristen & Unterschrift.</>
            ) : (
              <>Schalte ihn frei, um den <b>Volltext zu sehen</b>, als <b>PDF herunterzuladen</b>, auf <b>Rechtssicherheit zu prüfen</b> und <b>direkt unterschreiben</b> zu lassen.</>
            )}
          </div>
          {canUnlock ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, width: "100%", maxWidth: 340 }}>
              {/* Option 1: Einmalkauf (Vorrang) */}
              <button type="button" onClick={() => startGenerateUnlock(contractId)} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", font: "inherit", fontWeight: 700, fontSize: 14.5, borderRadius: 11, padding: "12px 20px", border: "none", cursor: "pointer", color: "#fff", background: "linear-gradient(135deg,#3b82f6 0%,#2563eb 100%)", boxShadow: "0 4px 14px rgba(37,99,235,.25)" }}>
                Freischalten · 9,90 € <ArrowRight size={16} />
              </button>
              <div style={{ fontSize: 12, color: "#64748b" }}>Einmalig, kein Abo · Volltext, PDF &amp; Unterschrift</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", margin: "2px 0", color: "#94a3b8", fontSize: 11.5 }}>
                <span style={{ flex: 1, height: 1, background: "#e2e8f0" }} /> oder <span style={{ flex: 1, height: 1, background: "#e2e8f0" }} />
              </div>
              {/* Option 2: Abo (auch attraktiv) */}
              <a href="/pricing" onClick={(e) => { e.preventDefault(); startBusinessSubscription(); }} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", font: "inherit", fontWeight: 700, fontSize: 14.5, borderRadius: 11, padding: "11px 20px", textDecoration: "none", color: "#2563eb", background: "#fff", border: "1.5px solid #bcd0f7", cursor: "pointer" }}>
                Mit Business: alle Verträge frei
              </a>
              <div style={{ fontSize: 12, color: "#64748b" }}>+ unbegrenzt Analysen, Optimierung, Fristen &amp; mehr</div>
            </div>
          ) : (
            <>
              <a href="/pricing" style={{ display: "inline-flex", alignItems: "center", gap: 8, font: "inherit", fontWeight: 600, fontSize: 14, borderRadius: 10, padding: "11px 24px", textDecoration: "none", color: "#fff", background: "linear-gradient(135deg,#3b82f6 0%,#2563eb 100%)", boxShadow: "0 4px 14px rgba(37,99,235,.25)" }}>
                Jetzt freischalten <ArrowRight size={17} />
              </a>
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 10 }}>Schon ab dem Business-Tarif · jederzeit kündbar</div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Dots() {
  return (
    <span style={{ display: "inline-flex", gap: 4 }}>
      {[0, 1, 2].map((i) => (
        <span key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: C.blue, opacity: 0.5, animation: `pchatpulse 1s ${i * 0.15}s infinite ease-in-out` }} />
      ))}
      <style>{`@keyframes pchatpulse{0%,100%{opacity:.25;transform:translateY(0)}50%{opacity:.9;transform:translateY(-2px)}}`}</style>
    </span>
  );
}

// Unterschrift-Zeichenfeld (Maus/Touch) → liefert PNG-DataURL
function SignaturePad({ onSave, onCancel }: { onSave: (dataUrl: string) => void; onCancel: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const hasInk = useRef(false);

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.strokeStyle = "#0B1324";
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, []);

  const pos = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const cv = canvasRef.current!;
    const r = cv.getBoundingClientRect();
    return { x: (e.clientX - r.left) * (cv.width / r.width), y: (e.clientY - r.top) * (cv.height / r.height) };
  };
  const down = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    drawing.current = true;
    const ctx = canvasRef.current!.getContext("2d")!;
    const p = pos(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
  };
  const move = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const ctx = canvasRef.current!.getContext("2d")!;
    const p = pos(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    hasInk.current = true;
  };
  const up = () => { drawing.current = false; };
  const clear = () => {
    const cv = canvasRef.current!;
    const ctx = cv.getContext("2d")!;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, cv.width, cv.height);
    hasInk.current = false;
  };
  const save = () => {
    if (!hasInk.current) { onCancel(); return; }
    onSave(canvasRef.current!.toDataURL("image/png"));
  };

  return (
    <div style={{ padding: "10px 15px 2px" }}>
      <canvas
        ref={canvasRef}
        width={760}
        height={200}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerLeave={up}
        style={{ width: "100%", height: 120, border: `1.5px dashed ${C.border}`, borderRadius: 10, background: "#fff", touchAction: "none", cursor: "crosshair", display: "block" }}
      />
      <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center" }}>
        <span style={{ fontSize: 11.5, color: C.muted2, marginRight: "auto" }}>Mit Maus oder Finger im Feld unterschreiben</span>
        <button type="button" onClick={clear} style={{ font: "inherit", fontSize: 12.5, fontWeight: 600, cursor: "pointer", borderRadius: 8, padding: "6px 12px", border: `1px solid ${C.border}`, background: "#fff", color: "#41506b" }}>Löschen</button>
        <button type="button" onClick={onCancel} style={{ font: "inherit", fontSize: 12.5, fontWeight: 600, cursor: "pointer", borderRadius: 8, padding: "6px 12px", border: `1px solid ${C.border}`, background: "#fff", color: "#41506b" }}>Abbrechen</button>
        <button type="button" onClick={save} style={{ font: "inherit", fontSize: 12.5, fontWeight: 600, cursor: "pointer", borderRadius: 8, padding: "6px 14px", border: "none", color: "#fff", background: `linear-gradient(135deg,${C.blue},${C.blue2})` }}>Übernehmen</button>
      </div>
    </div>
  );
}
