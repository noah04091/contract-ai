import { createContext, useContext, useState, useEffect } from "react";
import { fetchUserData } from "../utils/fetchUserData";
import type { UserData } from "./authUtils";

interface AuthContextType {
  user: UserData | null;
  setUser: (user: UserData | null) => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  setUser: () => {},
  isLoading: true,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await fetchUserData();
        setUser(userData);
      } catch {
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadUser();
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
