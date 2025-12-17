import { useContext } from "react";
import SidebarContext from "./SidebarContext";

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) throw new Error("useSidebar muss innerhalb von SidebarProvider verwendet werden.");
  return context;
};
