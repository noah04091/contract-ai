import { useContext } from "react";
import ThemeContext from "./ThemeContext"; // 🔧 Typ entfernt, da nicht verwendet

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
};
