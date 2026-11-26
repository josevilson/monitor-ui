"use client";

import type { StatsPeriodPreset, StatsViewMode } from "@/types/monitoring";

interface StatsControlsBarProps {
  startDate: string;
  endDate: string;
  minDate: string;
  maxDate: string;
  periodPreset: StatsPeriodPreset;
  viewMode: StatsViewMode;
  onStartDateChange: (val: string) => void;
  onEndDateChange: (val: string) => void;
  onPresetChange: (preset: "week" | "month" | "year") => void;
  onViewModeChange: (mode: StatsViewMode) => void;
}

const PRESETS: { value: "week" | "month" | "year"; label: string }[] = [
  { value: "week", label: "Semana" },
  { value: "month", label: "Mês" },
  { value: "year", label: "Ano" },
];

/**
 * Shared period range selector (manual dates + week/month/year presets)
 * and chart/table view toggle for modal statistics sections.
 */
export function StatsControlsBar({
  startDate,
  endDate,
  minDate,
  maxDate,
  periodPreset,
  viewMode,
  onStartDateChange,
  onEndDateChange,
  onPresetChange,
  onViewModeChange,
}: StatsControlsBarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-border bg-background p-2.5">
      <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
        <span className="text-muted">Período manual:</span>
        <input
          type="date"
          aria-label="Data inicial das estatísticas"
          value={startDate}
          min={minDate}
          max={maxDate}
          onChange={(e) => onStartDateChange(e.target.value)}
          className="rounded-md border border-border bg-surface px-2 py-1 font-mono text-[11px] text-foreground focus:border-primary focus:outline-none"
        />
        <span className="text-muted">até</span>
        <input
          type="date"
          aria-label="Data final das estatísticas"
          value={endDate}
          min={minDate}
          max={maxDate}
          onChange={(e) => onEndDateChange(e.target.value)}
          className="rounded-md border border-border bg-surface px-2 py-1 font-mono text-[11px] text-foreground focus:border-primary focus:outline-none"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-lg border border-border bg-surface p-0.5 text-[11px]">
          {PRESETS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => onPresetChange(p.value)}
              className={`rounded-md px-2 py-1 transition-colors ${
                periodPreset === p.value
                  ? "bg-primary font-medium text-primary-foreground"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="inline-flex rounded-lg border border-border bg-surface p-0.5 text-[11px]">
          <button
            type="button"
            onClick={() => onViewModeChange("chart")}
            className={`rounded-md px-2.5 py-1 transition-colors ${
              viewMode === "chart"
                ? "bg-primary font-medium text-primary-foreground"
                : "text-muted hover:text-foreground"
            }`}
          >
            Gráfico
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange("table")}
            className={`rounded-md px-2.5 py-1 transition-colors ${
              viewMode === "table"
                ? "bg-primary font-medium text-primary-foreground"
                : "text-muted hover:text-foreground"
            }`}
          >
            Tabela
          </button>
        </div>
      </div>
    </div>
  );
}
