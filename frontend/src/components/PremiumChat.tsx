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
import { Sparkles, Send, Download, Lock, ArrowLeft, ArrowRight, ShieldCheck, Check, PenLine, AlertTriangle, X, Bell, Calendar, ChevronDown, BookOpen } from "lucide-react";
import { toast } from "react-toastify";
import EnhancedSignatureModal from "./EnhancedSignatureModal";
import { useAuth } from "../hooks/useAuth";

type Kind = "text" | "questions" | "contract" | "generating" | "review" | "streaming" | "events" | "explain" | "demolock";
interface CalItem { title: string; date: string; severity?: string }
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

// Beispiel-Vertrag für die Free-Demo (kein KI-Lauf, reine Vorschau → Upsell)
const DEMO_CONTRACT =
  "FREELANCER-VERTRAG (WEBENTWICKLUNG)\n\n" +
  "zwischen\nHerrn Max Beispiel, Musterstraße 1, 10115 Berlin\n– nachfolgend „Auftragnehmer" + "“ genannt –\n\n" +
  "und\nder Beispiel GmbH, Hauptstraße 5, 20095 Hamburg\n– nachfolgend „Auftraggeber" + "“ genannt –\n\n" +
  "§ 1 Vertragsgegenstand\n(1) Der Auftragnehmer erbringt für den Auftraggeber Leistungen der Webentwicklung gemäß Anlage 1.\n\n" +
  "§ 2 Vergütung\n(1) Die Vergütung beträgt 80,00 € netto je geleisteter Stunde zzgl. der gesetzlichen Umsatzsteuer.\n(2) Die Abrechnung erfolgt monatlich nach Stundennachweis.\n\n" +
  "§ 3 Laufzeit & Kündigung\n(1) Der Vertrag läuft auf unbestimmte Zeit und kann mit einer Frist von 14 Tagen gekündigt werden.\n\n" +
  "§ 4 Nutzungsrechte\n(1) Die Rechte an den Arbeitsergebnissen gehen erst mit vollständiger Bezahlung auf den Auftraggeber über.\n";

export default function PremiumChat({ onClose, demo = false }: { onClose: () => void; demo?: boolean }) {
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
    if (demo) { setInput(""); return runDemo(text); }
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
  async function streamGenerate(base: ChatMsg[], contractType: string, existingContractId?: string) {
    let acc = "";
    setMessages((m) => [...m.filter((x) => x.kind !== "generating" && x.kind !== "streaming"), { role: "assistant", kind: "streaming", content: "", uiOnly: true }]);
    const res = await fetch("/api/contracts/premium/generate-stream", {
      method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: toApi(base), contractType, existingContractId: existingContractId || null }),
    });
    if (!res.ok || !res.body) {
      const data = await res.json().catch(() => ({}));
      const e: any = new Error(data.message || "Fehler"); e.data = data; throw e;
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
          acc += evt.text;
          setMessages((m) => m.map((x) => (x.kind === "streaming" ? { ...x, content: acc } : x)));
        } else if (evt.type === "done") {
          done = evt;
          const c = { contractId: evt.contractId, contractText: evt.contractText, contractType: evt.contractType, title: evt.title };
          setContract(c);
          setMessages((m) => [...m.filter((x) => x.kind !== "streaming"), { role: "assistant", kind: "contract", content: evt.contractText, contract: c }]);
        } else if (evt.type === "events") {
          if (evt.count > 0) {
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
      await streamGenerate(base, contractType || "Vertrag");
    } catch (e: any) {
      const msg = e?.data?.limitReached ? "Du hast dein monatliches Limit erreicht. Bitte Plan upgraden." : "Da ist gerade etwas schiefgelaufen — bitte versuch es nochmal.";
      setMessages((m) => [...m.filter((x) => x.kind !== "generating" && x.kind !== "streaming"), { role: "assistant", kind: "text", content: msg }]);
      toast.info(msg);
    } finally {
      setBusy(false);
    }
  }

  // Free-Demo: Beispiel-Vertrag „tippen" lassen, dann Sperr-Karte (kein KI-Lauf)
  async function runDemo(userText: string) {
    if (busy) return;
    setBusy(true);
    setMessages((m) => [...m, { role: "user", kind: "text", content: userText }, { role: "assistant", kind: "streaming", content: "", uiOnly: true }]);
    const chunks = DEMO_CONTRACT.match(/[\s\S]{1,28}/g) || [DEMO_CONTRACT];
    let acc = "";
    for (const ch of chunks) {
      acc += ch;
      setMessages((m) => m.map((x) => (x.kind === "streaming" ? { ...x, content: acc } : x)));
      await new Promise((r) => setTimeout(r, 70));
    }
    setMessages((m) => [...m.filter((x) => x.kind !== "streaming"), { role: "assistant", kind: "demolock", uiOnly: true, content: "lock" }]);
    setBusy(false);
  }

  async function downloadPdf(c: NonNullable<ChatMsg["contract"]>, design: string, signature?: string | null) {
    try {
      const res = await fetch("/api/contracts/premium/pdf", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contractId: c.contractId, design, signature: signature || null }) });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = (c.title || "Vertrag") + ".pdf"; a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error("PDF konnte nicht erstellt werden."); }
  }

  // Zur Unterschrift senden: Premium-PDF → S3 → bestehenden Envelope-Dialog öffnen
  async function sendForSignature(c: NonNullable<ChatMsg["contract"]>, design: string, signature?: string | null) {
    const t = toast.loading("Vertrag wird für die Unterschrift vorbereitet …");
    try {
      const pdfRes = await fetch("/api/contracts/premium/pdf", {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contractId: c.contractId, design, signature: signature || null }),
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

function Bubble({ m, onDownload, onReview, onExplain, onApplyRec, onSkip, onSend, busy }: { m: ChatMsg; onDownload: (c: NonNullable<ChatMsg["contract"]>, design: string, signature?: string | null) => void; onReview: (c: NonNullable<ChatMsg["contract"]>) => void; onExplain: (c: NonNullable<ChatMsg["contract"]>) => void; onApplyRec: (r: ReviewData) => void; onSkip: (contractType?: string) => void; onSend: (c: NonNullable<ChatMsg["contract"]>, design: string, signature?: string | null) => void; busy: boolean }) {
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
        <LockCard />
      ) : (
        <div style={bubbleStyle}>{m.display ?? m.content}</div>
      )}
    </div>
  );
}

function ContractCard({ c, onDownload, onReview, onExplain, onSend }: { c: NonNullable<ChatMsg["contract"]>; onDownload: (c: NonNullable<ChatMsg["contract"]>, design: string, signature?: string | null) => void; onReview: (c: NonNullable<ChatMsg["contract"]>) => void; onExplain: (c: NonNullable<ChatMsg["contract"]>) => void; onSend: (c: NonNullable<ChatMsg["contract"]>, design: string, signature?: string | null) => void }) {
  const [design, setDesign] = useState("klassisch");
  const [signature, setSignature] = useState<string | null>(null);
  const [showPad, setShowPad] = useState(false);
  const lines = c.contractText.split("\n").filter((l) => l.trim()).slice(0, 8);
  const sectionCount = (c.contractText.match(/^§\s*\d/gm) || []).length;
  const designs = [
    { id: "klassisch", label: "Klassisch" },
    { id: "elegant", label: "Elegant" },
    { id: "modern", label: "Modern" },
  ];
  const accent = design === "modern" ? "#0ea5e9" : "#1f4e8c";
  return (
    <div style={{ border: `1px solid ${C.border}`, borderRadius: 14, overflow: "hidden", background: "#fff", maxWidth: 460 }}>
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
      {/* Design-Auswahl (ändert die Optik, nicht den Inhalt) */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 15px 0", flexWrap: "wrap" }}>
        <span style={{ fontSize: 12, color: C.muted, fontWeight: 600 }}>Design:</span>
        {designs.map((dd) => (
          <button key={dd.id} type="button" onClick={() => setDesign(dd.id)}
            style={{ font: "inherit", fontSize: 12, fontWeight: 600, cursor: "pointer", borderRadius: 8, padding: "5px 11px", border: `1px solid ${design === dd.id ? C.blue : C.border}`, background: design === dd.id ? "rgba(46,108,246,.08)" : "#fff", color: design === dd.id ? C.blue : "#41506b" }}>
            {dd.label}
          </button>
        ))}
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
        <button onClick={() => onDownload(c, design, signature)} style={{ display: "inline-flex", alignItems: "center", gap: 7, font: "inherit", fontWeight: 600, fontSize: 13, borderRadius: 10, padding: "9px 14px", cursor: "pointer", border: "none", color: "#fff", background: `linear-gradient(135deg,${C.blue},${C.blue2})`, boxShadow: "0 6px 14px -4px rgba(46,108,246,.45)" }}>
          <Download size={16} /> PDF herunterladen
        </button>
        <button onClick={() => onSend(c, design, signature)} title="Vertrag an die andere Partei zum Unterschreiben senden" style={{ display: "inline-flex", alignItems: "center", gap: 6, font: "inherit", fontWeight: 600, fontSize: 13, borderRadius: 10, padding: "9px 13px", cursor: "pointer", border: `1px solid ${C.border}`, background: "#fff", color: "#33415c" }}>
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

function LockCard() {
  return (
    <div style={{ display: "flex", gap: 11, maxWidth: "90%" }}>
      <div style={{ width: 30, height: 30, borderRadius: "50%", background: `linear-gradient(135deg,${C.blue},${C.blue2})`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", flex: "none" }}><Lock size={15} /></div>
      <div style={{ border: `1.5px solid #d6e2fb`, borderRadius: 14, borderTopLeftRadius: 4, overflow: "hidden", flex: 1, background: "linear-gradient(135deg, rgba(46,108,246,.06), rgba(30,83,216,.03))" }}>
        <div style={{ padding: "16px 18px" }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: C.ink, marginBottom: 6, display: "flex", alignItems: "center", gap: 7 }}><Lock size={16} color={C.blue} /> Dein Vertrag ist fertig!</div>
          <div style={{ fontSize: 13.5, color: "#41506b", lineHeight: 1.55, marginBottom: 14 }}>
            Mit einem bezahlten Plan kannst du ihn als <b>PDF herunterladen</b>, auf <b>Rechtssicherheit prüfen</b> lassen, dir <b>jede Klausel erklären</b> lassen, <b>Fristen in deinen Kalender</b> übernehmen und <b>direkt unterschreiben lassen</b>.
          </div>
          <a href="/pricing" style={{ display: "inline-flex", alignItems: "center", gap: 7, font: "inherit", fontWeight: 600, fontSize: 13.5, borderRadius: 10, padding: "10px 16px", textDecoration: "none", color: "#fff", background: `linear-gradient(135deg,${C.blue},${C.blue2})`, boxShadow: "0 6px 14px -4px rgba(46,108,246,.45)" }}>
            Jetzt freischalten <ArrowRight size={16} />
          </a>
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
