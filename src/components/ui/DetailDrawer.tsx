"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

interface DetailDrawerProps {
  open: boolean;
  onClose: () => void;
  kicker: string;
  title: string;
  children: React.ReactNode;
}

/**
 * Minimalist centered modal for progressive disclosure of technical details.
 */
export function DetailDrawer({
  open,
  onClose,
  kicker,
  title,
  children,
}: DetailDrawerProps) {
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div
        onClick={onClose}
        aria-hidden="true"
        className="fixed inset-0 bg-black/50 backdrop-blur-[2px] transition-opacity"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative z-10 flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl"
      >
        <div className="flex items-center justify-between gap-3 border-b border-border px-6 py-4">
          <div className="min-w-0">
            <span className="block text-[11px] font-medium uppercase tracking-wider text-muted">
              {kicker}
            </span>
            <h2 className="mt-0.5 truncate font-mono text-sm font-semibold text-foreground">
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border text-muted transition-colors hover:bg-surface-muted hover:text-foreground"
            aria-label="Fechar modal"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-6 text-xs">
          {children}
        </div>
      </div>
    </div>
  );
}
