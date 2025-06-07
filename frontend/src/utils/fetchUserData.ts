// 📁 frontend/src/utils/fetchUserData.ts - FIXED: Korrekte API Response Struktur

export const fetchUserData = async () => {
  const response = await fetch("/api/auth/me", {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Fehler beim Abrufen der Benutzerdaten");
  }

  const data = await response.json();
  
  // ✅ FIX: Backend gibt { user: userData } zurück - extrahiere user!
  return data.user; // ← Das war das Problem! Vorher: return data;
};