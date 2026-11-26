"use client";

import { Fragment, useMemo, useState } from "react";
import { VOLUMETRY_DATES_ISO } from "@/data/mock-kafka-databricks";
import { EnvBadge } from "@/components/ui/Badges";
import { VolumetryDetailDrawer } from "@/components/kafka/VolumetryDetailDrawer";
import {
  formatCompactNumber,
  formatFullNumber,
  formatShortDate,
  getScopeLabel,
} from "@/lib/format";
import type { EnvironmentFilter, KafkaDatabricksPair } from "@/types/monitoring";

interface VolumetryMatrixViewProps {
  pairs: KafkaDatabricksPair[];
  envFilter: EnvironmentFilter;
  searchQuery: string;
}

type KafkaHealthFilter = "ALL" | "LAG" | "VOLUME_DIFF" | "SCHEMA_DRIFT";

export function VolumetryMatrixView({
  pairs,
  envFilter,
  searchQuery,
}: VolumetryMatrixViewProps) {
  const minDate = VOLUMETRY_DATES_ISO[0];
  const maxDate = VOLUMETRY_DATES_ISO[VOLUMETRY_DATES_ISO.length - 1];

  const [healthFilter, setHealthFilter] = useState<KafkaHealthFilter>("ALL");
  const [startDate, setStartDate] = useState("2026-11-19");
  const [endDate, setEndDate] = useState(maxDate);
  const [drawerState, setDrawerState] = useState<{
    pair: KafkaDatabricksPair;
    focusDateIso: string | null;
  } | null>(null);

  const normalizedRange = useMemo(() => {
    const start = startDate <= endDate ? startDate : endDate;
    const end = startDate <= endDate ? endDate : startDate;
    return { start, end };
  }, [startDate, endDate]);

  const selectedDates = useMemo(
    () =>
      VOLUMETRY_DATES_ISO.filter(
        (d) => d >= normalizedRange.start && d <= normalizedRange.end
      ),
    [normalizedRange]
  );

  const envPairs = useMemo(
    () => pairs.filter((p) => envFilter === "all" || p.env === envFilter),
    [pairs, envFilter]
  );

  const counts = useMemo(
    () => ({
      ALL: envPairs.length,
      LAG: envPairs.filter((p) => p.lagStatus === "LAG").length,
      VOLUME_DIFF: envPairs.filter((p) => p.volumeStatus === "VOLUME_DIFF").length,
      SCHEMA_DRIFT: envPairs.filter((p) => p.schemaStatus === "DRIFT").length,
    }),
    [envPairs]
  );

  const filteredPairs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return envPairs.filter((pair) => {
      const matchHealth =
        healthFilter === "ALL" ||
        (healthFilter === "LAG" && pair.lagStatus === "LAG") ||
        (healthFilter === "VOLUME_DIFF" && pair.volumeStatus === "VOLUME_DIFF") ||
        (healthFilter === "SCHEMA_DRIFT" && pair.schemaStatus === "DRIFT");
      const matchQuery =
        !q ||
        pair.topic.toLowerCase().includes(q) ||
        pair.tableName.toLowerCase().includes(q);
      return matchHealth && matchQuery;
    });
  }, [envPairs, healthFilter, searchQuery]);

  const applyPreset = (days: number) => {
    const idx = Math.max(0, VOLUMETRY_DATES_ISO.length - days);
    setStartDate(VOLUMETRY_DATES_ISO[idx]);
    setEndDate(maxDate);
  };

  const chips: { value: KafkaHealthFilter; label: string; dot?: string }[] = [
    { value: "ALL", label: "Todos os Vínculos" },
    { value: "LAG", label: "Atraso (+1d)", dot: "bg-error" },
    { value: "VOLUME_DIFF", label: "Divergência", dot: "bg-warning" },
    { value: "SCHEMA_DRIFT", label: "Schema Drift", dot: "bg-primary" },
  ];

  return (
    <section className="space-y-4">
      {/* Health Filter Chips + Manual Date Selector */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {chips.map((chip) => {
            const active = healthFilter === chip.value;
            return (
              <button
                key={chip.value}
                type="button"
                onClick={() => setHealthFilter(chip.value)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 transition-colors ${
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-surface text-foreground hover:border-muted"
                }`}
              >
                {chip.dot && (
                  <span
                    className={`h-2 w-2 rounded-full ${
                      active ? "bg-primary-foreground" : chip.dot
                    }`}
                  />
                )}
                <span>{chip.label}</span>
                <span className="font-mono tabular-nums opacity-75">
                  {counts[chip.value]}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-muted">Período manual:</span>
          <input
            type="date"
            aria-label="Data inicial"
            value={startDate}
            min={minDate}
            max={maxDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="rounded-lg border border-border bg-surface px-2.5 py-1 font-mono text-xs text-foreground focus:border-primary focus:outline-none"
          />
          <span className="text-muted">até</span>
          <input
            type="date"
            aria-label="Data final"
            value={endDate}
            min={minDate}
            max={maxDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="rounded-lg border border-border bg-surface px-2.5 py-1 font-mono text-xs text-foreground focus:border-primary focus:outline-none"
          />
          <div className="inline-flex rounded-lg border border-border bg-surface p-0.5">
            {[3, 7, 14].map((days) => (
              <button
                key={days}
                type="button"
                onClick={() => applyPreset(days)}
                className="rounded px-2 py-1 font-mono text-[11px] text-muted transition-colors hover:text-foreground"
              >
                {days}d
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Comparison Matrix: Tópico | Nome da Tabela | Origem | Datas... | Acumulado (K / D) */}
      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead className="border-b border-border text-muted">
              <tr>
                <th className="sticky left-0 z-10 min-w-[205px] max-w-[230px] whitespace-nowrap bg-surface px-3.5 py-3 font-medium">
                  Tópico (Kafdrop)
                </th>
                <th className="min-w-[210px] max-w-[240px] whitespace-nowrap px-3.5 py-3 font-medium">
                  Nome da Tabela (Databricks)
                </th>
                <th className="whitespace-nowrap border-r border-border px-2.5 py-3 font-medium">
                  Origem
                </th>
                {selectedDates.map((iso) => (
                  <th
                    key={iso}
                    className="min-w-[68px] whitespace-nowrap px-2 py-3 text-right font-mono font-medium tabular-nums"
                  >
                    {formatShortDate(iso)}
                  </th>
                ))}
                <th className="sticky right-0 z-10 min-w-[145px] whitespace-nowrap border-l border-border bg-surface px-3.5 py-3 text-right font-medium shadow-[-6px_0_10px_-6px_rgba(0,0,0,0.35)]">
                  Acumulado (K / D)
                </th>
              </tr>
            </thead>

            <tbody>
              {filteredPairs.length === 0 ? (
                <tr>
                  <td
                    colSpan={selectedDates.length + 4}
                    className="py-10 text-center text-muted"
                  >
                    Nenhum vínculo Tópico ↔ Tabela encontrado para os filtros atuais.
                  </td>
                </tr>
              ) : (
                filteredPairs.map((pair) => {
                  const slice = pair.daily.filter((d) =>
                    selectedDates.includes(d.dateIso)
                  );
                  const accKafdrop = slice.reduce(
                    (acc, d) => acc + d.kafdropCount,
                    0
                  );
                  const accDbx = slice.reduce(
                    (acc, d) => acc + d.databricksCount,
                    0
                  );
                  const accDiff = accDbx - accKafdrop;
                  const pct =
                    accKafdrop > 0
                      ? ((accDbx / accKafdrop) * 100).toFixed(1)
                      : "0.0";

                  return (
                    <Fragment key={pair.id}>
                      {/* Row 1: Kafdrop (K) */}
                      <tr className="group border-t border-border transition-colors hover:bg-surface-muted/40">
                        <td
                          rowSpan={2}
                          onClick={() =>
                            setDrawerState({ pair, focusDateIso: null })
                          }
                          className="sticky left-0 z-10 max-w-[230px] cursor-pointer border-b border-border bg-surface px-3.5 py-3 align-middle group-hover:bg-surface-muted"
                        >
                          <div className="flex items-center gap-1.5">
                            <EnvBadge env={pair.env} />
                            <span
                              title={pair.topic}
                              className="truncate font-mono font-semibold text-foreground transition-colors group-hover:text-primary"
                            >
                              {pair.topic}
                            </span>
                          </div>
                          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[10px]">
                            <span
                              className={`rounded border px-1.5 py-0.5 font-medium ${
                                pair.lagStatus === "OK"
                                  ? "border-success/50 text-success"
                                  : "border-error/60 text-error"
                              }`}
                            >
                              {pair.lagLabel}
                            </span>
                            {pair.schemaStatus === "DRIFT" && (
                              <span className="rounded border border-primary/50 px-1.5 py-0.5 font-medium text-primary">
                                {pair.schemaLabel}
                              </span>
                            )}
                          </div>
                        </td>

                        <td
                          rowSpan={2}
                          onClick={() =>
                            setDrawerState({ pair, focusDateIso: null })
                          }
                          className="max-w-[240px] cursor-pointer border-b border-border px-3.5 py-3 align-middle"
                        >
                          <div
                            title={pair.tableName}
                            className="truncate font-mono text-foreground"
                          >
                            {pair.tableName}
                          </div>
                          <div className="mt-1 text-[11px] text-muted">
                            {getScopeLabel(pair.monitoredEnvs)}
                          </div>
                        </td>

                        <td className="whitespace-nowrap border-r border-border px-2.5 py-2 text-[11px] font-medium text-primary">
                          <span className="inline-flex items-center gap-1.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                            Kafdrop
                          </span>
                        </td>

                        {slice.map((day) => (
                          <td
                            key={`${pair.id}-k-${day.dateIso}`}
                            onClick={() =>
                              setDrawerState({ pair, focusDateIso: day.dateIso })
                            }
                            title={`Kafdrop ${formatShortDate(day.dateIso)}: ${formatFullNumber(day.kafdropCount)}`}
                            className="cursor-pointer px-2 py-2 text-right font-mono tabular-nums text-foreground transition-colors hover:bg-surface-muted"
                          >
                            {formatCompactNumber(day.kafdropCount)}
                          </td>
                        ))}

                        <td
                          onClick={() =>
                            setDrawerState({ pair, focusDateIso: null })
                          }
                          className="sticky right-0 z-10 cursor-pointer border-l border-border bg-surface px-3.5 py-2 text-right font-mono tabular-nums shadow-[-6px_0_10px_-6px_rgba(0,0,0,0.35)] group-hover:bg-surface-muted"
                        >
                          <span className="font-semibold text-foreground">
                            {formatFullNumber(accKafdrop)}
                          </span>
                          <span className="ml-1.5 font-sans text-[10px] text-muted">
                            K
                          </span>
                        </td>
                      </tr>

                      {/* Row 2: Databricks (D) */}
                      <tr className="group border-b border-border transition-colors hover:bg-surface-muted/40">
                        <td className="whitespace-nowrap border-r border-border px-2.5 py-2 text-[11px] font-medium text-muted">
                          <span className="inline-flex items-center gap-1.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-success" />
                            Databricks
                          </span>
                        </td>

                        {slice.map((day) => {
                          const dotColor =
                            day.status === "OK"
                              ? "bg-success"
                              : day.status === "DIFF"
                                ? "bg-warning"
                                : "bg-error";
                          const textColor =
                            day.status === "LAG"
                              ? "font-semibold text-error"
                              : day.status === "DIFF"
                                ? "font-semibold text-warning"
                                : "text-muted";

                          return (
                            <td
                              key={`${pair.id}-d-${day.dateIso}`}
                              onClick={() =>
                                setDrawerState({ pair, focusDateIso: day.dateIso })
                              }
                              title={`Databricks ${formatShortDate(day.dateIso)}: ${formatFullNumber(day.databricksCount)}`}
                              className={`cursor-pointer px-2 py-2 text-right font-mono tabular-nums transition-colors hover:bg-surface-muted ${textColor}`}
                            >
                              <span className="inline-flex items-center justify-end gap-1.5">
                                <span
                                  className={`h-1.5 w-1.5 rounded-full ${dotColor}`}
                                />
                                {formatCompactNumber(day.databricksCount)}
                              </span>
                            </td>
                          );
                        })}

                        <td
                          onClick={() =>
                            setDrawerState({ pair, focusDateIso: null })
                          }
                          className="sticky right-0 z-10 cursor-pointer border-l border-border bg-surface px-3.5 py-2 text-right font-mono tabular-nums shadow-[-6px_0_10px_-6px_rgba(0,0,0,0.35)] group-hover:bg-surface-muted"
                        >
                          <div
                            className={`font-semibold ${
                              accDiff < -1000 ? "text-error" : "text-success"
                            }`}
                          >
                            {formatFullNumber(accDbx)}
                          </div>
                          <div
                            className={`text-[10px] ${
                              accDiff < -1000 ? "text-error" : "text-muted"
                            }`}
                          >
                            {pct}%{" "}
                            {accDiff !== 0
                              ? `(${accDiff.toLocaleString("pt-BR")})`
                              : "· OK"}
                          </div>
                        </td>
                      </tr>
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Minimalist Legend */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border px-4 py-2.5 text-xs text-muted">
          <div className="flex flex-wrap items-center gap-4">
            <span>
              Linha superior:{" "}
              <strong className="text-foreground">Kafdrop (K)</strong> · Linha
              inferior: <strong className="text-foreground">Databricks (D)</strong>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-success" /> Volumes OK
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-warning" /> Divergência
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-error" /> Atraso (+1d)
            </span>
          </div>
          <span>Clique na linha ou em qualquer data para abrir Schema Drift e Gráfico</span>
        </div>
      </div>

      <VolumetryDetailDrawer
        pair={drawerState?.pair ?? null}
        focusDateIso={drawerState?.focusDateIso ?? null}
        startDate={normalizedRange.start}
        endDate={normalizedRange.end}
        onClose={() => setDrawerState(null)}
      />
    </section>
  );
}
