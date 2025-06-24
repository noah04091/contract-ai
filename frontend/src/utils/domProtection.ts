// src/utils/domProtection.ts

declare global {
  interface Window {
    __domProtectionApplied?: boolean;
  }
}

export function applyDOMProtectionFix() {
  if (typeof window !== "undefined" && !window.__domProtectionApplied) {
    console.log("🛡️ DOM Protection wird aktiviert...");

    // Original-Funktionen sichern
    const originalRemoveChild = Node.prototype.removeChild;
    const originalInsertBefore = Node.prototype.insertBefore;

    // removeChild Protection
    Node.prototype.removeChild = function (this: Node, child: Node): Node {
      try {
        // Prüfe ob Child wirklich ein Kind dieses Nodes ist
        if (!child || child.parentNode !== this) {
          console.warn("🛡️ DOM Protection: removeChild - Node ist nicht Child von Parent", {
            parent: this,
            child: child,
            actualParent: child?.parentNode
          });
          return child; // Stil zurückgeben ohne Fehler
        }
        
        return originalRemoveChild.call(this, child);
      } catch (error: any) {
        if (error.name === 'NotFoundError') {
          console.log("🛡️ DOM Protection: NotFoundError bei removeChild abgefangen", error.message);
          return child;
        }
        // Andere Fehler normal weiterwerfen
        throw error;
      }
    } as any;

    // insertBefore Protection (oft verwandt mit removeChild Problemen)
    Node.prototype.insertBefore = function (this: Node, newNode: Node, referenceNode: Node | null): Node {
      try {
        return originalInsertBefore.call(this, newNode, referenceNode);
      } catch (error: any) {
        if (error.name === 'NotFoundError') {
          console.log("🛡️ DOM Protection: NotFoundError bei insertBefore abgefangen, fallback zu appendChild");
          return this.appendChild(newNode);
        }
        throw error;
      }
    } as any;

    window.__domProtectionApplied = true;
    console.log("✅ DOM Protection erfolgreich aktiviert");
  }
}