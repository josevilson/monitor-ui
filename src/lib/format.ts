import type { Environment } from "@/types/monitoring";

export function formatShortDate(dateIso: string): string {
  const parts = dateIso.split("-");
  if (parts.length !== 3) return dateIso;
  return `${parts[2]}/${parts[1]}`;
}

export function formatCompactNumber(value: number): string {
  if (value === 0) return "0";
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return value.toLocaleString("pt-BR");
}

export function formatFullNumber(value: number): string {
  return value.toLocaleString("pt-BR");
}

export function formatDuration(seconds: number | null): string {
  if (seconds === null) return "—";
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const remSec = seconds % 60;
  if (mins < 60) return remSec > 0 ? `${mins}m ${remSec}s` : `${mins}m`;
  const hours = Math.floor(mins / 60);
  const remMin = mins % 60;
  return remMin > 0 ? `${hours}h ${remMin}m` : `${hours}h`;
}

export function getScopeLabel(monitoredEnvs: Environment[]): string {
  if (monitoredEnvs.includes("prd") && monitoredEnvs.includes("hk")) {
    return "Monitorado em PRD e HK";
  }
  return monitoredEnvs[0] === "prd" ? "Exclusivo PRD" : "Exclusivo HK";
}
