"use client";

import { Moon, Search, Sun, X } from "lucide-react";
import type { EnvironmentFilter, MonitorTab } from "@/types/monitoring";

interface TopNavProps {
  env: EnvironmentFilter;
  onEnvChange: (env: EnvironmentFilter) => void;
  activeTab: MonitorTab;
  onTabChange: (tab: MonitorTab) => void;
  theme: "dark" | "light";
  onToggleTheme: () => void;
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
}

const ENV_OPTIONS: { value: EnvironmentFilter; label: string }[] = [
  { value: "prd", label: "PRD" },
  { value: "hk", label: "HK" },
  { value: "all", label: "Todos" },
];

export function TopNav({
  env,
  onEnvChange,
  activeTab,
  onTabChange,
  theme,
  onToggleTheme,
  searchValue,
  onSearchChange,
  searchPlaceholder,
}: TopNavProps) {
  const envBadge =
    env === "prd"
      ? { dot: "bg-success", text: "PRD · Produção" }
      : env === "hk"
        ? { dot: "bg-warning", text: "HK · Homologação" }
        : { dot: "bg-primary", text: "PRD + HK" };

  return (
    <header className="flex flex-col justify-between gap-4 border-b border-border pb-4 xl:flex-row xl:items-center">
      <div className="flex shrink-0 items-center gap-3">
        <span className={`h-2.5 w-2.5 rounded-full ${envBadge.dot}`} />
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-semibold tracking-tight text-foreground">
              Observability Hub
            </h1>
            <span className="rounded border border-border px-2 py-0.5 font-mono text-[10px] font-semibold uppercase text-muted">
              {envBadge.text}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-muted">
            Orquestração Control-M &amp; Conciliação Kafdrop → Databricks
          </p>
        </div>
      </div>

      {/* Top-Center Search Bar + Right Controls */}
      <div className="flex flex-1 flex-wrap items-center justify-end gap-2.5">
        <div className="relative w-full sm:w-80 lg:w-96">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
          <input
            type="text"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full rounded-lg border border-border bg-background py-1.5 pl-8 pr-7 text-xs text-foreground placeholder:text-muted focus:border-primary focus:outline-none"
          />
          {searchValue && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              aria-label="Limpar pesquisa"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Global Environment Switcher */}
        <div
          role="group"
          aria-label="Seletor de ambiente"
          className="inline-flex rounded-lg border border-border bg-surface p-1 text-xs"
        >
          {ENV_OPTIONS.map((opt) => {
            const active = env === opt.value;
            const activeClass =
              opt.value === "prd"
                ? "bg-primary text-primary-foreground"
                : opt.value === "hk"
                  ? "bg-warning text-primary-foreground"
                  : "bg-foreground text-background";
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onEnvChange(opt.value)}
                className={`rounded-md px-2.5 py-1 font-mono font-medium transition-colors ${
                  active ? activeClass : "text-muted hover:text-foreground"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        {/* Module Navigation */}
        <nav
          aria-label="Módulos de monitoração"
          className="inline-flex rounded-lg border border-border bg-surface p-1 text-xs"
        >
          <button
            type="button"
            onClick={() => onTabChange("jobs")}
            className={`rounded-md px-3.5 py-1.5 font-medium transition-colors ${
              activeTab === "jobs"
                ? "bg-primary text-primary-foreground"
                : "text-muted hover:text-foreground"
            }`}
          >
            Control-M Jobs
          </button>
          <button
            type="button"
            onClick={() => onTabChange("kafka")}
            className={`rounded-md px-3.5 py-1.5 font-medium transition-colors ${
              activeTab === "kafka"
                ? "bg-primary text-primary-foreground"
                : "text-muted hover:text-foreground"
            }`}
          >
            Kafdrop → Databricks
          </button>
        </nav>

        {/* Minimalist Theme Switch */}
        <button
          type="button"
          onClick={onToggleTheme}
          title={theme === "dark" ? "Alternar para tema claro" : "Alternar para tema escuro"}
          aria-label="Alternar tema"
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface text-muted transition-colors hover:text-foreground"
        >
          {theme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
        </button>
      </div>
    </header>
  );
}
