"use client";

import { useMemo, useState } from "react";
import { DetailDrawer } from "@/components/ui/DetailDrawer";
import { EnvBadge } from "@/components/ui/Badges";
import { StatsControlsBar } from "@/components/ui/StatsControlsBar";
import { InteractiveLineChart } from "@/components/ui/InteractiveLineChart";
import {
  formatCompactNumber,
  formatFullNumber,
  formatShortDate,
  getScopeLabel,
} from "@/lib/format";
import { getKafkaStatsSeries } from "@/lib/stats-history";
import type {
  KafkaDatabricksPair,
  StatsPeriodPreset,
  StatsViewMode,
} from "@/types/monitoring";

interface VolumetryDetailDrawerProps {
  pair: KafkaDatabricksPair | null;
  focusDateIso: string | null;
  startDate: string;
  endDate: string;
  onClose: () => void;
}

export function VolumetryDetailDrawer({
  pair,
  focusDateIso,
  startDate,
  endDate,
  onClose,
}: VolumetryDetailDrawerProps) {
  const [periodPreset, setPeriodPreset] = useState<StatsPeriodPreset>("week");
  const [viewMode, setViewMode] = useState<StatsViewMode>("chart");
  const [statsStartDate, setStatsStartDate] = useState(startDate);
  const [statsEndDate, setStatsEndDate] = useState(endDate);

  const statsBundle = useMemo(
    () => (pair ? getKafkaStatsSeries(pair) : null),
    [pair]
  );

  const normalizedStatsRange = useMemo(() => {
    const s = statsStartDate <= statsEndDate ? statsStartDate : statsEndDate;
    const e = statsStartDate <= statsEndDate ? statsEndDate : statsStartDate;
    return { start: s, end: e };
  }, [statsStartDate, statsEndDate]);

  const statsPoints = useMemo(() => {
    if (!statsBundle) return [];
    if (periodPreset === "year") return statsBundle.yearly;
    return statsBundle.daily.filter(
      (d) =>
        d.dateIso &&
        d.dateIso >= normalizedStatsRange.start &&
        d.dateIso <= normalizedStatsRange.end
    );
  }, [statsBundle, periodPreset, normalizedStatsRange]);

  if (!pair || !statsBundle) return null;

  const slice = pair.daily.filter(
    (d) => d.dateIso >= startDate && d.dateIso <= endDate
  );
  const focusedDay = focusDateIso
    ? slice.find((d) => d.dateIso === focusDateIso) ?? null
    : null;

  const totalKafdrop = statsPoints.reduce((acc, p) => acc + p.kafdropCount, 0);
  const totalDatabricks = statsPoints.reduce(
    (acc, p) => acc + p.databricksCount,
    0
  );
  const totalDiff = totalDatabricks - totalKafdrop;
  const adherence =
    totalKafdrop > 0
      ? ((totalDatabricks / totalKafdrop) * 100).toFixed(1)
      : "0.0";

  const { snapshots } = statsBundle;
  const captureRate =
    snapshots.captureTotalCount > 0
      ? (
          (snapshots.captureSuccessCount / snapshots.captureTotalCount) *
          100
        ).toFixed(1)
      : "0.0";

  const handlePresetChange = (preset: "week" | "month" | "year") => {
    setPeriodPreset(preset);
    const { daily, maxDate, minDate } = statsBundle;
    if (preset === "week") {
      const idx = Math.max(0, daily.length - 7);
      setStatsStartDate(daily[idx]?.dateIso ?? "2026-11-19");
      setStatsEndDate(maxDate);
    } else if (preset === "month") {
      setStatsStartDate(daily[0]?.dateIso ?? "2026-10-27");
      setStatsEndDate(maxDate);
    } else {
      setStatsStartDate(minDate);
      setStatsEndDate(maxDate);
    }
  };

  return (
    <DetailDrawer
      open={Boolean(pair)}
      onClose={onClose}
      kicker={`Kafdrop → Databricks · ${pair.env.toUpperCase()}${
        focusDateIso ? ` · Dia ${formatShortDate(focusDateIso)}` : ""
      }`}
      title={pair.topic}
    >
      <div className="space-y-1.5 rounded-lg border border-border bg-background p-3">
        <div className="flex items-center justify-between">
          <span className="text-muted">Tabela Destino (Unity Catalog)</span>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted">
              {getScopeLabel(pair.monitoredEnvs)}
            </span>
            <EnvBadge env={pair.env} />
          </div>
        </div>
        <div className="font-mono font-medium text-foreground">
          {pair.tableName}
        </div>
        <div className="flex flex-wrap items-center gap-2 pt-0.5 text-[11px] text-muted">
          <span>
            Consumer:{" "}
            <code className="font-mono text-foreground">{pair.consumerGroup}</code>
          </span>
          <span>·</span>
          <span
            className={
              pair.lagStatus === "LAG" ? "font-medium text-error" : "text-success"
            }
          >
            {pair.lagLabel}
          </span>
        </div>
      </div>

      {focusedDay && (
        <div className="rounded-lg border border-primary/40 bg-primary/5 p-3">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-foreground">
              Dia Selecionado: {formatShortDate(focusedDay.dateIso)}
            </span>
            <span
              className={`font-medium ${
                focusedDay.status === "OK"
                  ? "text-success"
                  : focusedDay.status === "DIFF"
                    ? "text-warning"
                    : "text-error"
              }`}
            >
              {focusedDay.status === "OK"
                ? "Volumes OK"
                : focusedDay.status === "DIFF"
                  ? "Divergência de Volume"
                  : "Atraso (+1d)"}
            </span>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-2 font-mono text-[11px] tabular-nums">
            <div>
              <span className="block font-sans text-muted">Kafdrop</span>
              <span className="font-semibold text-foreground">
                {formatFullNumber(focusedDay.kafdropCount)}
              </span>
            </div>
            <div>
              <span className="block font-sans text-muted">Databricks</span>
              <span className="font-semibold text-foreground">
                {formatFullNumber(focusedDay.databricksCount)}
              </span>
            </div>
            <div>
              <span className="block font-sans text-muted">Diferença</span>
              <span
                className={`font-semibold ${
                  focusedDay.databricksCount - focusedDay.kafdropCount < 0
                    ? "text-error"
                    : "text-success"
                }`}
              >
                {(
                  focusedDay.databricksCount - focusedDay.kafdropCount
                ).toLocaleString("pt-BR")}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Schema Drift Audit */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-foreground">
            Checagem de Schema (Kafdrop ↔ Databricks)
          </span>
          <span className="text-[11px] text-muted">
            {pair.schemaDiff.length} colunas
          </span>
        </div>

        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-left text-[11px]">
            <thead className="bg-background text-muted">
              <tr>
                <th className="px-2.5 py-1.5 font-medium">Coluna</th>
                <th className="px-2.5 py-1.5 font-medium">Kafdrop</th>
                <th className="px-2.5 py-1.5 font-medium">Databricks</th>
                <th className="px-2.5 py-1.5 text-right font-medium">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border font-mono">
              {pair.schemaDiff.map((col) => (
                <tr
                  key={col.column}
                  className={col.state !== "MATCH" ? "bg-surface-muted/40" : ""}
                >
                  <td className="px-2.5 py-1.5 font-medium text-foreground">
                    {col.column}
                  </td>
                  <td className="px-2.5 py-1.5 font-sans">
                    {col.inKafdrop ? (
                      <span className="text-foreground">Presente</span>
                    ) : (
                      <span className="font-medium text-warning">Ausente</span>
                    )}
                  </td>
                  <td className="px-2.5 py-1.5 font-sans">
                    {col.inDatabricks ? (
                      <span className="text-foreground">Presente</span>
                    ) : (
                      <span className="font-medium text-primary">Ausente</span>
                    )}
                  </td>
                  <td className="px-2.5 py-1.5 text-right font-sans">
                    {col.state === "MATCH" ? (
                      <span className="text-success">OK</span>
                    ) : col.state === "MISSING_DBX" ? (
                      <span className="font-medium text-primary">
                        Ausente no DBX{col.detectedAt ? ` (${col.detectedAt})` : ""}
                      </span>
                    ) : (
                      <span className="font-medium text-warning">
                        Ausente no Kafdrop
                        {col.detectedAt ? ` (${col.detectedAt})` : ""}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom Statistics Section: Volumetry Analysis + Snapshots */}
      <div className="space-y-3.5 border-t border-border pt-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-xs font-semibold text-foreground">
            Estatísticas de Volumetria &amp; Snapshots
          </h3>
          <div className="flex items-center gap-3 text-[11px] text-muted">
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-primary" /> Kafdrop
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-success" /> Databricks
            </span>
          </div>
        </div>

        <StatsControlsBar
          startDate={normalizedStatsRange.start}
          endDate={normalizedStatsRange.end}
          minDate={statsBundle.minDate}
          maxDate={statsBundle.maxDate}
          periodPreset={periodPreset}
          viewMode={viewMode}
          onStartDateChange={(val) => {
            setPeriodPreset("custom");
            setStatsStartDate(val);
          }}
          onEndDateChange={(val) => {
            setPeriodPreset("custom");
            setStatsEndDate(val);
          }}
          onPresetChange={handlePresetChange}
          onViewModeChange={setViewMode}
        />

        {/* Period Volumetry KPIs */}
        <div className="grid grid-cols-3 gap-2.5 font-mono tabular-nums">
          <div className="rounded-lg border border-border bg-background p-2.5">
            <div className="font-sans text-[10px] text-muted">
              Total Kafdrop
            </div>
            <div className="mt-1 text-xs font-semibold text-foreground">
              {formatFullNumber(totalKafdrop)}
            </div>
          </div>
          <div className="rounded-lg border border-border bg-background p-2.5">
            <div className="font-sans text-[10px] text-muted">
              Total Databricks
            </div>
            <div
              className={`mt-1 text-xs font-semibold ${
                totalDiff < -1000 ? "text-error" : "text-success"
              }`}
            >
              {formatFullNumber(totalDatabricks)}
            </div>
          </div>
          <div className="rounded-lg border border-border bg-background p-2.5">
            <div className="font-sans text-[10px] text-muted">
              Aderência no Período
            </div>
            <div className="mt-1 text-xs font-semibold text-foreground">
              {adherence}%
            </div>
          </div>
        </div>

        {/* Chart (Line with Hover) or Horizontal-Period Table */}
        {viewMode === "chart" ? (
          <InteractiveLineChart mode="kafka" points={statsPoints} />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border bg-background">
            <table className="w-full border-collapse text-left text-[11px]">
              <thead className="border-b border-border text-muted">
                <tr>
                  <th className="sticky left-0 z-10 min-w-[104px] border-r border-border bg-background px-3 py-2 font-medium">
                    Origem
                  </th>
                  {statsPoints.map((p, idx) => (
                    <th
                      key={`${p.label}-${idx}`}
                      className="whitespace-nowrap px-2.5 py-2 text-right font-mono font-medium tabular-nums"
                    >
                      {p.label}
                    </th>
                  ))}
                  <th className="sticky right-0 z-10 min-w-[115px] border-l border-border bg-background px-3 py-2 text-right font-medium">
                    Acumulado
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border font-mono tabular-nums">
                <tr>
                  <td className="sticky left-0 z-10 border-r border-border bg-background px-3 py-1.5 font-sans font-medium text-primary">
                    Kafdrop
                  </td>
                  {statsPoints.map((p, idx) => (
                    <td
                      key={`k-${idx}`}
                      className="whitespace-nowrap px-2.5 py-1.5 text-right text-foreground"
                    >
                      {formatCompactNumber(p.kafdropCount)}
                    </td>
                  ))}
                  <td className="sticky right-0 z-10 whitespace-nowrap border-l border-border bg-background px-3 py-1.5 text-right font-semibold text-foreground">
                    {formatFullNumber(totalKafdrop)}
                  </td>
                </tr>
                <tr>
                  <td className="sticky left-0 z-10 border-r border-border bg-background px-3 py-1.5 font-sans font-medium text-success">
                    Databricks
                  </td>
                  {statsPoints.map((p, idx) => (
                    <td
                      key={`d-${idx}`}
                      className={`whitespace-nowrap px-2.5 py-1.5 text-right ${
                        p.status === "LAG"
                          ? "font-semibold text-error"
                          : p.status === "DIFF"
                            ? "font-semibold text-warning"
                            : "text-foreground"
                      }`}
                    >
                      {formatCompactNumber(p.databricksCount)}
                    </td>
                  ))}
                  <td
                    className={`sticky right-0 z-10 whitespace-nowrap border-l border-border bg-background px-3 py-1.5 text-right font-semibold ${
                      totalDiff < -1000 ? "text-error" : "text-success"
                    }`}
                  >
                    {formatFullNumber(totalDatabricks)}
                  </td>
                </tr>
                <tr>
                  <td className="sticky left-0 z-10 border-r border-border bg-background px-3 py-1.5 font-sans font-medium text-muted">
                    Snapshot
                  </td>
                  {statsPoints.map((p, idx) => (
                    <td
                      key={`s-${idx}`}
                      className="whitespace-nowrap px-2.5 py-1.5 text-right text-[10px] text-muted"
                    >
                      {p.snapshotAt}
                    </td>
                  ))}
                  <td className="sticky right-0 z-10 border-l border-border bg-background px-3 py-1.5 text-right text-[10px] text-muted">
                    {adherence}%
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Snapshots Capture Statistics */}
        <div className="space-y-2.5 rounded-xl border border-border bg-background p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-semibold text-foreground">
              Snapshots (Captura dos Dados)
            </span>
            <span className="font-mono text-[11px] text-success">
              {snapshots.captureSuccessCount} / {snapshots.captureTotalCount} capturas OK ({captureRate}%)
            </span>
          </div>

          <div className="grid grid-cols-1 gap-2.5 text-[11px] sm:grid-cols-3">
            <div className="rounded-lg border border-border bg-surface p-2">
              <div className="text-muted">Último Snapshot Kafdrop</div>
              <div className="mt-0.5 font-mono font-semibold text-foreground">
                {snapshots.lastKafdropAt}
              </div>
              <div className="mt-0.5 text-[10px] text-success">Capturado OK</div>
            </div>
            <div className="rounded-lg border border-border bg-surface p-2">
              <div className="text-muted">Último Snapshot Databricks</div>
              <div className="mt-0.5 font-mono font-semibold text-foreground">
                {snapshots.lastDatabricksAt}
              </div>
              <div
                className={`mt-0.5 text-[10px] ${
                  pair.lagStatus === "LAG" ? "text-warning" : "text-success"
                }`}
              >
                {pair.lagStatus === "LAG" ? "Atraso na captura" : "Capturado OK"}
              </div>
            </div>
            <div className="rounded-lg border border-border bg-surface p-2">
              <div className="text-muted">Cadência / Defasagem</div>
              <div className="mt-0.5 font-mono font-semibold text-foreground">
                {snapshots.cadenceLabel}
              </div>
              <div className="mt-0.5 text-[10px] text-muted">
                {snapshots.clockSkewLabel}
              </div>
            </div>
          </div>

          {snapshots.recentCaptures && snapshots.recentCaptures.length > 0 && (
            <div className="overflow-hidden rounded-lg border border-border">
              <table className="w-full text-left text-[11px]">
                <thead className="bg-surface text-muted">
                  <tr>
                    <th className="px-2.5 py-1.5 font-medium">Capturado em</th>
                    <th className="px-2.5 py-1.5 text-right font-medium">
                      Kafdrop
                    </th>
                    <th className="px-2.5 py-1.5 text-right font-medium">
                      Databricks
                    </th>
                    <th className="px-2.5 py-1.5 text-right font-medium">
                      Coleta
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border font-mono tabular-nums">
                  {snapshots.recentCaptures.map((cap, idx) => (
                    <tr key={`${cap.capturedAt}-${idx}`}>
                      <td className="px-2.5 py-1.5 text-foreground">
                        {cap.capturedAt}
                      </td>
                      <td className="px-2.5 py-1.5 text-right text-foreground">
                        {cap.kafdropCount !== null
                          ? formatFullNumber(cap.kafdropCount)
                          : "—"}
                      </td>
                      <td className="px-2.5 py-1.5 text-right text-foreground">
                        {cap.databricksCount !== null
                          ? formatFullNumber(cap.databricksCount)
                          : "—"}
                      </td>
                      <td
                        className={`px-2.5 py-1.5 text-right font-sans ${
                          cap.status === "OK"
                            ? "text-success"
                            : cap.status === "PARTIAL"
                              ? "text-warning"
                              : "text-error"
                        }`}
                      >
                        {cap.latencyLabel}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DetailDrawer>
  );
}
