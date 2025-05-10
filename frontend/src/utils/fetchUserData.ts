// 📁 frontend/src/utils/fetchUserData.ts

export const fetchUserData = async () => {
    const response = await fetch("/api/auth/me", {
      method: "GET",
      credentials: "include",
    });
  
    if (!response.ok) {
      throw new Error("Fehler beim Abrufen der Benutzerdaten");
    }
  
    return await response.json();
  };
  