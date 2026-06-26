// Stufe 2 — Einmal-Freischaltung (mode:"payment", kein Abo).
// Startet den Stripe-Einmalkauf für genau diesen Vertrag und leitet zur Checkout-Seite.
// Nach Erfolg landet der User wieder bei /contracts?view=<id>&unlocked=1 (success_url im Backend).
//
// Zwei Arten (kind):
//   - "analysis_unlock"  → Analyse-Freischaltung (4,90 €)
//   - "generate_unlock"  → generierter Vertrag freischalten (9,90 €)
type UnlockKind = "analysis_unlock" | "generate_unlock";

export async function startUnlock(contractId?: string | null, kind: UnlockKind = "analysis_unlock"): Promise<void> {
  if (!contractId) {
    alert("Das kann gerade nicht freigeschaltet werden (keine Vertrags-ID).");
    return;
  }
  try {
    const token = localStorage.getItem("token") || localStorage.getItem("authToken");
    const res = await fetch(`/api/stripe/create-unlock-session`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: "include",
      body: JSON.stringify({ contractId, kind }),
    });
    const data = await res.json().catch(() => ({}));

    if (res.ok && data?.url) {
      window.location.href = data.url; // → Stripe Checkout
      return;
    }
    if (data?.alreadyUnlocked) {
      // Schon bezahlt → einfach neu laden, damit der volle Inhalt erscheint
      window.location.reload();
      return;
    }
    if (res.status === 503) {
      // Einmal-Freischaltung (noch) nicht aktiviert → sanfter Fallback auf die Tarife
      window.location.href = "/pricing";
      return;
    }
    alert(data?.message || "Die Freischaltung ist derzeit nicht verfügbar. Bitte später erneut versuchen.");
  } catch (err) {
    console.error("[Unlock] Fehler beim Start der Freischaltung:", err);
    alert("Die Freischaltung konnte nicht gestartet werden. Bitte später erneut versuchen.");
  }
}

// Bestehender Aufruf (Analyse) — unverändert kompatibel.
export function startAnalysisUnlock(contractId?: string | null): Promise<void> {
  return startUnlock(contractId, "analysis_unlock");
}

// Neu: generierten Vertrag einmalig freischalten (9,90 €).
export function startGenerateUnlock(contractId?: string | null): Promise<void> {
  return startUnlock(contractId, "generate_unlock");
}

// Direktes Abo-Checkout (Business, monatlich) — überspringt die /pricing-Zwischenseite und
// schickt direkt zum Stripe-Abo-Checkout. Fallback bei Fehler → /pricing.
export async function startBusinessSubscription(): Promise<void> {
  try {
    const token = localStorage.getItem("token") || localStorage.getItem("authToken");
    const res = await fetch(`/api/stripe/create-checkout-session`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: "include",
      body: JSON.stringify({ plan: "business", billing: "monthly" }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data?.url) {
      window.location.href = data.url; // → Stripe Abo-Checkout
      return;
    }
    window.location.href = "/pricing"; // Fallback (z.B. Preis-ID fehlt)
  } catch (err) {
    console.error("[Abo] Checkout-Start fehlgeschlagen:", err);
    window.location.href = "/pricing";
  }
}
