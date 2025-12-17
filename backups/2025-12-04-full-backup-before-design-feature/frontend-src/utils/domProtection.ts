/* eslint-disable @typescript-eslint/no-explicit-any */
// DOM Protection Fix – any ist notwendig für DOM-Prototype-Patching

// src/utils/domProtection.ts
declare global {
  interface Window {
    __domProtectionApplied?: boolean;
  }
}

export function applyDOMProtectionFix() {
  if (typeof window !== "undefined" && !window.__domProtectionApplied) {
    if (process.env.NODE_ENV === "development") {
      console.log("🛡️ DOM Protection wird aktiviert...");
    }

    // Original-Funktionen sichern
    const originalRemoveChild = Node.prototype.removeChild;
    const originalInsertBefore = Node.prototype.insertBefore;

    // removeChild Protection
    Node.prototype.removeChild = function (this: Node, child: Node): Node {
      try {
        if (!child || child.parentNode !== this) {
          if (process.env.NODE_ENV === "development") {
            console.warn("🛡️ DOM Protection: removeChild - Node ist nicht Child von Parent", {
              parent: this,
              child: child,
              actualParent: child?.parentNode
            });
          }
          return child;
        }
        return originalRemoveChild.call(this, child);
      } catch (error: any) {
        if (error.name === "NotFoundError") {
          if (process.env.NODE_ENV === "development") {
            console.log("🛡️ DOM Protection: NotFoundError bei removeChild abgefangen", error.message);
          }
          return child;
        }
        throw error;
      }
    } as any;

    // insertBefore Protection
    Node.prototype.insertBefore = function (this: Node, newNode: Node, referenceNode: Node | null): Node {
      try {
        return originalInsertBefore.call(this, newNode, referenceNode);
      } catch (error: any) {
        if (error.name === "NotFoundError") {
          if (process.env.NODE_ENV === "development") {
            console.log("🛡️ DOM Protection: NotFoundError bei insertBefore abgefangen, fallback zu appendChild");
          }
          return this.appendChild(newNode);
        }
        throw error;
      }
    } as any;

    window.__domProtectionApplied = true;

    if (process.env.NODE_ENV === "development") {
      console.log("✅ DOM Protection erfolgreich aktiviert");
    }
  }
}
