// 📁 src/hooks/useAuth.ts - Separate hook file
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";

// ✅ useAuth hook moved to separate file to fix fast refresh issue
export const useAuth = () => {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
};