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
import { Sparkles, Send, Download, Lock, ArrowLeft, ShieldCheck, Check, PenLine } from "lucide-react";
import { toast } from "react-toastify";

type Kind = "text" | "questions" | "contract" | "generating";
interface ChatMsg {
  role: "user" | "assistant";
  kind: Kind;
  content: string;          // an die API gesendeter Text
  uiOnly?: boolean;         // z.B. Begrüßung – nicht an die API
  questions?: { id: string; frage: string; warum: string }[];
  contract?: { contractId: string; contractText: string; contractType: string; title?: string };
}

const C = {
  blue: "#2E6CF6", blue2: "#1E53D8", ink: "#0B1324", muted: "#667085",
  muted2: "#8a94a6", border: "#E7EAF0", track: "#EEF1F6", bg: "#F7F9FC",
};

export default function PremiumChat({ onClose }: { onClose: () => void }) {
  const [messages, setMessages] = useState<ChatMsg[]>([
    { role: "assistant", kind: "text", uiOnly: true, content: "Hi! Beschreib mir einfach in eigenen Worten, welchen Vertrag du brauchst — Stichworte reichen völlig." },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [contract, setContract] = useState<ChatMsg["contract"] | null>(null);
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

  async function handleSend() {
    const text = input.trim();
    if (!text || busy) return;
    const base = [...messages, { role: "user", kind: "text", content: text } as ChatMsg];
    setMessages(base);
    setInput("");
    setBusy(true);
    setMessages((m) => [...m, { role: "assistant", kind: "generating", content: "" }]);

    const finish = (msg: ChatMsg) => setMessages((m) => [...m.filter((x) => x.kind !== "generating"), msg]);

    try {
      if (!contract) {
        // Phase 1: bewerten — Rückfragen oder generieren
        const a = await postJson("/api/contracts/premium/chat", { messages: toApi(base) });
        if (a.ready) {
          const g = await postJson("/api/contracts/premium/generate", { messages: toApi(base), contractType: a.contractType });
          const c = { contractId: g.contractId, contractText: g.contractText, contractType: g.contractType, title: g.title };
          setContract(c);
          finish({ role: "assistant", kind: "contract", content: g.contractText, contract: c });
        } else {
          finish({ role: "assistant", kind: "questions", content: "Rückfragen: " + a.questions.map((q: any) => q.frage).join(" "), questions: a.questions });
        }
      } else {
        // Phase 2: Verfeinern — neuer Vertrag aus vollem Verlauf
        const g = await postJson("/api/contracts/premium/generate", { messages: toApi(base), contractType: contract.contractType });
        const c = { contractId: g.contractId, contractText: g.contractText, contractType: g.contractType, title: g.title };
        setContract(c);
        finish({ role: "assistant", kind: "contract", content: g.contractText, contract: c });
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
          <Bubble key={i} m={m} onDownload={downloadPdf} />
        ))}
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
          <button onClick={handleSend} disabled={busy || !input.trim()} title="Senden"
            style={{ width: 38, height: 38, borderRadius: 10, border: "none", background: busy || !input.trim() ? "#c7d4ee" : `linear-gradient(135deg,${C.blue},${C.blue2})`, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: busy || !input.trim() ? "default" : "pointer", flex: "none" }}>
            <Send size={18} />
          </button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "center", color: C.muted2, fontSize: 11, marginTop: 9 }}>
          <Lock size={13} /> Kein Ersatz für Rechtsberatung · deine Eingaben bleiben vertraulich
        </div>
      </div>
    </div>
  );
}

function Bubble({ m, onDownload }: { m: ChatMsg; onDownload: (c: NonNullable<ChatMsg["contract"]>, design: string, signature?: string | null) => void }) {
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
      {m.kind === "questions" ? (
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
        </div>
      ) : m.kind === "contract" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: "88%" }}>
          <div style={bubbleStyle}>Fertig — hier ist dein Vertrag:</div>
          <ContractCard c={m.contract!} onDownload={onDownload} />
          <div style={{ ...bubbleStyle, maxWidth: "100%", fontSize: 13, color: "#41506b" }}>
            Du kannst unten weiter mit mir chatten, um Klauseln zu ändern — z. B. „Laufzeit auf 6 Monate“ oder „Wettbewerbsverbot ergänzen“.
          </div>
        </div>
      ) : (
        <div style={bubbleStyle}>{m.content}</div>
      )}
    </div>
  );
}

function ContractCard({ c, onDownload }: { c: NonNullable<ChatMsg["contract"]>; onDownload: (c: NonNullable<ChatMsg["contract"]>, design: string, signature?: string | null) => void }) {
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

      <div style={{ display: "flex", gap: 9, padding: "12px 15px 14px", alignItems: "center" }}>
        <button onClick={() => onDownload(c, design, signature)} style={{ display: "inline-flex", alignItems: "center", gap: 7, font: "inherit", fontWeight: 600, fontSize: 13, borderRadius: 10, padding: "9px 14px", cursor: "pointer", border: "none", color: "#fff", background: `linear-gradient(135deg,${C.blue},${C.blue2})`, boxShadow: "0 6px 14px -4px rgba(46,108,246,.45)" }}>
          <Download size={16} /> PDF herunterladen
        </button>
        <span style={{ marginLeft: "auto", fontSize: 11, color: C.muted2, display: "flex", alignItems: "center", gap: 5 }}><ShieldCheck size={13} /> {sectionCount || ""} §§ · gespeichert</span>
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
