"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Filter, Search, X } from "lucide-react";

export interface FilterOption {
  value: string;
  label: string;
  count?: number;
  dotClass?: string;
}

interface ColumnFilterPopoverProps {
  label: string;
  options: FilterOption[];
  selectedValues: string[];
  onChange: (nextValues: string[]) => void;
  searchPlaceholder?: string;
  compact?: boolean;
  align?: "left" | "right";
}

/**
 * Minimalist searchable multi-select column filter using fixed positioning
 * so it never clips inside horizontally scrollable tables.
 */
export function ColumnFilterPopover({
  label,
  options,
  selectedValues,
  onChange,
  searchPlaceholder = "Pesquisar...",
  compact = false,
  align = "left",
}: ColumnFilterPopoverProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(
    null
  );

  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const activeCount = selectedValues.length;
  const isActive = activeCount > 0;

  const filteredOptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((opt) => opt.label.toLowerCase().includes(q));
  }, [options, query]);

  const updatePosition = () => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const popoverWidth = 240;
    const rawLeft = align === "right" ? rect.right - popoverWidth : rect.left;
    const clampedLeft = Math.max(
      12,
      Math.min(rawLeft, window.innerWidth - popoverWidth - 12)
    );
    const top = Math.min(rect.bottom + 6, window.innerHeight - 280);
    setCoords({ top, left: clampedLeft });
  };

  useEffect(() => {
    if (!open) return;
    updatePosition();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        popoverRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    };
    const onResizeOrScroll = () => updatePosition();

    window.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onMouseDown);
    window.addEventListener("resize", onResizeOrScroll);
    window.addEventListener("scroll", onResizeOrScroll, true);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("resize", onResizeOrScroll);
      window.removeEventListener("scroll", onResizeOrScroll, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, align]);

  const toggleValue = (val: string) => {
    if (selectedValues.includes(val)) {
      onChange(selectedValues.filter((v) => v !== val));
    } else {
      onChange([...selectedValues, val]);
    }
  };

  return (
    <div className="inline-flex items-center">
      <button
        ref={triggerRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setQuery("");
          setOpen((prev) => !prev);
        }}
        title={`Filtrar ${label}`}
        className={`inline-flex items-center gap-1 rounded-md transition-colors ${
          compact ? "px-1 py-0.5 text-[11px]" : "px-1.5 py-1 text-xs"
        } ${
          isActive
            ? "bg-primary/15 font-semibold text-primary"
            : "text-muted hover:bg-surface-muted hover:text-foreground"
        }`}
      >
        <span>{label}</span>
        {!compact && <Filter className="h-3 w-3 opacity-75" />}
        {isActive && (
          <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 font-mono text-[10px] text-primary-foreground">
            {activeCount}
          </span>
        )}
      </button>

      {open && coords && (
        <div
          ref={popoverRef}
          style={{ top: coords.top, left: coords.left, width: 240 }}
          className="fixed z-50 rounded-xl border border-border bg-surface p-2.5 text-xs shadow-2xl"
        >
          <div className="mb-2 flex items-center justify-between gap-2 px-0.5">
            <span className="truncate font-semibold text-foreground">
              Filtrar: {label}
            </span>
            {isActive ? (
              <button
                type="button"
                onClick={() => onChange([])}
                className="inline-flex items-center gap-0.5 text-[11px] font-medium text-primary hover:underline"
              >
                <X className="h-3 w-3" /> Limpar
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onChange(options.map((o) => o.value))}
                className="text-[11px] text-muted hover:text-foreground"
              >
                Todos
              </button>
            )}
          </div>

          <div className="relative mb-2">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-muted" />
            <input
              type="text"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full rounded-lg border border-border bg-background py-1.5 pl-7 pr-2.5 text-[11px] text-foreground placeholder:text-muted focus:border-primary focus:outline-none"
            />
          </div>

          <div className="max-h-48 space-y-0.5 overflow-y-auto pr-0.5">
            {filteredOptions.length === 0 ? (
              <div className="py-3 text-center text-[11px] text-muted">
                Nenhuma opção encontrada
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const checked = selectedValues.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleValue(opt.value)}
                    className={`flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-[11px] transition-colors ${
                      checked
                        ? "bg-primary/10 text-foreground"
                        : "text-foreground hover:bg-surface-muted"
                    }`}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span
                        className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border ${
                          checked
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-background"
                        }`}
                      >
                        {checked && <Check className="h-2.5 w-2.5" />}
                      </span>
                      {opt.dotClass && (
                        <span
                          className={`h-2 w-2 shrink-0 rounded-full ${opt.dotClass}`}
                        />
                      )}
                      <span className="truncate font-medium">{opt.label}</span>
                    </span>
                    {typeof opt.count === "number" && (
                      <span className="shrink-0 font-mono text-[10px] tabular-nums text-muted">
                        {opt.count}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
