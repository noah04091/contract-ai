// 📁 src/components/ProtectedRoute.tsx
import { Navigate } from "react-router-dom";

interface Props {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: Props) {
  // Prüfe verschiedene mögliche Token-Speicherorte für Kompatibilität
  const token = localStorage.getItem("authToken") || 
                localStorage.getItem("token");

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}