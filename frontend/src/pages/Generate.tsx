import { useEffect, useRef, useState } from "react";
import styles from "../styles/Generate.module.css";
import PremiumNotice from "../components/PremiumNotice";
import { CheckCircle, Clipboard, Save } from "lucide-react";
import html2pdf from "html2pdf.js";
import API_BASE_URL from "../utils/api";

export default function Generate() {
  const [contractType, setContractType] = useState("freelancer");
  const [formData, setFormData] = useState<any>({});
  const [generated, setGenerated] = useState("");
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [finished, setFinished] = useState(false);
  const [isPremium, setIsPremium] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const contractRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [signatureURL, setSignatureURL] = useState<string | null>(null);

  useEffect(() => {
    const fetchStatus = async () => {
      const token = localStorage.getItem("token");
      if (!token) return setIsPremium(false);

      try {
        const res = await fetch(`${API_BASE_URL}/auth/me`, {
          headers: { Authorization: token },
        });
        const data = await res.json();
        setIsPremium(data.subscriptionActive === true);
      } catch (err) {
        console.error("❌ Fehler beim Laden des Abostatus:", err);
        setIsPremium(false);
      }
    };
    fetchStatus();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let drawing = false;

    const start = (e: any) => {
      drawing = true;
      ctx.beginPath();
      ctx.moveTo(
        e.clientX || e.touches?.[0]?.clientX - canvas.getBoundingClientRect().left,
        e.clientY || e.touches?.[0]?.clientY - canvas.getBoundingClientRect().top
      );
    };

    const draw = (e: any) => {
      if (!drawing) return;
      ctx.lineTo(
        e.clientX || e.touches?.[0]?.clientX - canvas.getBoundingClientRect().left,
        e.clientY || e.touches?.[0]?.clientY - canvas.getBoundingClientRect().top
      );
      ctx.stroke();
    };

    const stop = () => { drawing = false; };

    canvas.addEventListener("mousedown", start);
    canvas.addEventListener("mousemove", draw);
    canvas.addEventListener("mouseup", stop);
    canvas.addEventListener("touchstart", start);
    canvas.addEventListener("touchmove", draw);
    canvas.addEventListener("touchend", stop);

    return () => {
      canvas.removeEventListener("mousedown", start);
      canvas.removeEventListener("mousemove", draw);
      canvas.removeEventListener("mouseup", stop);
      canvas.removeEventListener("touchstart", start);
      canvas.removeEventListener("touchmove", draw);
      canvas.removeEventListener("touchend", stop);
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData || !formData.title || !formData.details || !isPremium) return;

    setLoading(true);
    setGenerated("");
    setCopied(false);
    setSaved(false);
    setFinished(false);

    try {
      const res = await fetch(`${API_BASE_URL}/api/contracts/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
        },
        body: JSON.stringify({ type: contractType, formData }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Fehler bei der Generierung.");
      setGenerated(data.contractText);
      setFinished(true);
    } catch (err: any) {
      alert("Fehler: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generated);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert("❌ Kopieren fehlgeschlagen.");
    }
  };

  const handleSave = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/contracts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
        },
        body: JSON.stringify({
          name: formData.title,
          laufzeit: "Generiert",
          kuendigung: "Generiert",
          expiryDate: "",
          status: "Aktiv",
          content: generated,
        }),
      });
      if (!res.ok) throw new Error("Speichern fehlgeschlagen.");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      alert("Fehler beim Speichern: " + err.message);
    }
  };

  const saveSignature = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const dataURL = canvas.toDataURL("image/png");
      setSignatureURL(dataURL);
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setSignatureURL(null);
      }
    }
  };

  const handleDownloadPDF = () => {
    if (!contractRef.current) return;
    const signatureImage = document.createElement("img");
    if (signatureURL) {
      signatureImage.src = signatureURL;
      signatureImage.style.maxWidth = "200px";
      signatureImage.style.marginTop = "20px";
      contractRef.current.appendChild(signatureImage);
    }

    const opt = {
      margin: 0.5,
      filename: `${formData.title}_vertrag.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: "in", format: "a4", orientation: "portrait" },
    };

    html2pdf().set(opt).from(contractRef.current).save().then(() => {
      if (signatureImage && contractRef.current?.contains(signatureImage)) {
        contractRef.current.removeChild(signatureImage);
      }
    });
  };

  const renderAdditionalFields = () => {
    if (contractType === "custom") {
      return (
        <label>
          Beschreibung / Inhalte:
          <textarea
            name="details"
            value={formData.details || ""}
            onChange={handleChange}
            rows={5}
            placeholder="Was soll der Vertrag enthalten? Ziele, Vereinbarungen, Fristen..."
            disabled={!isPremium}
          />
        </label>
      );
    }
    return null;
  };

  if (isPremium === null) return <p style={{ padding: "2rem" }}>⏳ Lade...</p>;

  return (
    <div className={styles.container}>
      <h2>📄 Vertrag generieren</h2>
      <p>Erstelle individuelle Verträge mit KI. Wähle einen Typ, gib Titel & Beschreibung ein und unterschreibe direkt im Browser.</p>

      {!isPremium && <PremiumNotice />}

      <form onSubmit={handleSubmit} className={styles.form}>
        <label>
          Vertragstyp:
          <select
            value={contractType}
            onChange={(e) => setContractType(e.target.value)}
            disabled={!isPremium}
          >
            <option value="freelancer">Freelancervertrag</option>
            <option value="mietvertrag">Mietvertrag</option>
            <option value="arbeitsvertrag">Arbeitsvertrag</option>
            <option value="kaufvertrag">Kaufvertrag</option>
            <option value="nda">Geheimhaltungsvertrag (NDA)</option>
            <option value="custom">Sonstiger Vertrag</option>
          </select>
        </label>

        <label>
          Vertragstitel:
          <input
            type="text"
            name="title"
            value={formData.title || ""}
            onChange={handleChange}
            placeholder="z. B. Freelancer-Vertrag"
            disabled={!isPremium}
          />
        </label>

        {renderAdditionalFields()}

        <button type="submit" disabled={loading || !isPremium}>
          {loading ? "⏳ Generiere..." : "🚀 Vertrag erstellen"}
        </button>
      </form>

      {loading && <div className={styles.loading}>🧠 KI denkt nach...</div>}

      {generated && (
        <div className={styles.result}>
          <h3>📑 Generierter Vertrag</h3>
          <div ref={contractRef} style={{ whiteSpace: "pre-wrap", background: "#f9f9f9", padding: "20px", borderRadius: "8px" }}>
            {generated}
            <br /><br />
            <strong>Digitale Unterschrift:</strong><br />
            {signatureURL && <img src={signatureURL} alt="Unterschrift" style={{ maxWidth: "200px", marginTop: "10px" }} />}
          </div>

          <div style={{ marginTop: "20px" }}>
            <canvas ref={canvasRef} width={400} height={150} style={{ border: "1px solid #ccc" }} />
            <div>
              <button onClick={clearCanvas}>Unterschrift löschen</button>
              <button onClick={saveSignature}>Unterschrift übernehmen</button>
            </div>
          </div>

          <div className={styles.actions}>
            <button onClick={handleCopy}>
              {copied ? <CheckCircle size={16} /> : <Clipboard size={16} />} {copied ? "Kopiert!" : "Kopieren"}
            </button>

            <button onClick={handleSave}>
              {saved ? "Gespeichert" : <Save size={16} />} {saved ? "Gespeichert" : "In Verträge speichern"}
            </button>

            <button onClick={handleDownloadPDF}>PDF herunterladen</button>
          </div>
        </div>
      )}

      {finished && (
        <div className={styles.successBox}>
          ✅ Vertrag erfolgreich generiert! Du kannst ihn jetzt speichern, kopieren, unterschreiben oder herunterladen.
        </div>
      )}
    </div>
  );
}
