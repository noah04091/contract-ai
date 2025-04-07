// src/context/SidebarContext.tsx
import { createContext, useContext, useState } from "react";

interface SidebarContextType {
  isOpen: boolean;
  toggle: () => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(true);

  const toggle = () => setIsOpen(prev => {
    const newValue = !prev;
    document.documentElement.style.setProperty("--sidebar-offset", newValue ? "240px" : "0px");
    return newValue;
  });

  return (
    <SidebarContext.Provider value={{ isOpen, toggle }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) throw new Error("useSidebar muss innerhalb von SidebarProvider verwendet werden.");
  return context;
}
