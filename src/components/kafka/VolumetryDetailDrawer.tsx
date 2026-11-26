"use client";

import { DetailDrawer } from "@/components/ui/DetailDrawer";
import { EnvBadge } from "@/components/ui/Badges";
import { formatFullNumber, formatShortDate, getScopeLabel } from "@/lib/format";
import type { KafkaDatabricksPair } from "@/types/monitoring";

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
  if (!pair) return null;

  const slice = pair.daily.filter(
    (d) => d.dateIso >= startDate && d.dateIso <= endDate
  );
  const accKafdrop = slice.reduce((acc, d) => acc + d.kafdropCount, 0);
  const accDbx = slice.reduce((acc, d) => acc + d.databricksCount, 0);
  const accDiff = accDbx - accKafdrop;
  const maxVal = Math.max(
    ...slice.map((d) => Math.max(d.kafdropCount, d.databricksCount)),
    1
  );

  const focusedDay = focusDateIso
    ? slice.find((d) => d.dateIso === focusDateIso) ?? null
    : null;

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
            Consumer: <code className="font-mono text-foreground">{pair.consumerGroup}</code>
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
          <div className="mt-2 grid grid-cols-3 gap-2 font-mono tabular-nums text-[11px]">
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

      {/* Accumulated Totals for Selected Period */}
      <div className="grid grid-cols-2 gap-3 font-mono tabular-nums">
        <div className="rounded-lg border border-border p-3">
          <div className="font-sans text-[11px] text-muted">
            Acumulado Kafdrop ({slice.length}d)
          </div>
          <div className="mt-1 text-sm font-semibold text-foreground">
            {formatFullNumber(accKafdrop)}
          </div>
        </div>
        <div className="rounded-lg border border-border p-3">
          <div className="font-sans text-[11px] text-muted">
            Acumulado Databricks ({slice.length}d)
          </div>
          <div
            className={`mt-1 text-sm font-semibold ${
              accDiff < -1000 ? "text-error" : "text-success"
            }`}
          >
            {formatFullNumber(accDbx)}
          </div>
        </div>
      </div>

      {/* Period Comparison Chart */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-foreground">
            Comparação no Período ({formatShortDate(startDate)} –{" "}
            {formatShortDate(endDate)})
          </span>
          <div className="flex items-center gap-3 text-[11px] text-muted">
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-sm bg-primary" /> Kafdrop
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-sm bg-success" /> Databricks
            </span>
          </div>
        </div>

        <div
          className="grid h-32 items-end gap-1.5 border-b border-border pb-1.5"
          style={{
            gridTemplateColumns: `repeat(${Math.max(slice.length, 1)}, minmax(0, 1fr))`,
          }}
        >
          {slice.map((d) => {
            const kh = Math.max(4, Math.round((d.kafdropCount / maxVal) * 100));
            const dh =
              d.databricksCount === 0
                ? 2
                : Math.max(4, Math.round((d.databricksCount / maxVal) * 100));
            const barColor =
              d.status === "OK"
                ? "bg-success"
                : d.status === "DIFF"
                  ? "bg-warning"
                  : "bg-error";

            return (
              <div
                key={d.dateIso}
                className={`flex h-full flex-col items-center justify-end gap-1 ${
                  focusDateIso === d.dateIso ? "rounded bg-surface-muted px-0.5" : ""
                }`}
              >
                <div className="flex h-24 w-full items-end justify-center gap-0.5">
                  <div
                    title={`Kafdrop ${formatShortDate(d.dateIso)}: ${formatFullNumber(
                      d.kafdropCount
                    )}`}
                    className="w-2 rounded-t bg-primary/80 transition-all"
                    style={{ height: `${kh}%` }}
                  />
                  <div
                    title={`Databricks ${formatShortDate(
                      d.dateIso
                    )}: ${formatFullNumber(d.databricksCount)}`}
                    className={`w-2 rounded-t transition-all ${barColor}`}
                    style={{ height: `${dh}%` }}
                  />
                </div>
                <span className="font-mono text-[9px] tabular-nums text-muted">
                  {formatShortDate(d.dateIso)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

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
                        Ausente no Kafdrop{col.detectedAt ? ` (${col.detectedAt})` : ""}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Linked Control-M Jobs */}
      <div className="rounded-lg border border-border p-3">
        <div className="text-[11px] text-muted">
          Jobs Control-M Dependentes ({pair.env.toUpperCase()})
        </div>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {pair.linkedJobs.length > 0 ? (
            pair.linkedJobs.map((jobName) => (
              <span
                key={jobName}
                className="rounded border border-border bg-background px-2 py-0.5 font-mono text-[11px] text-foreground"
              >
                {jobName}
              </span>
            ))
          ) : (
            <span className="text-muted">Nenhum job vinculado</span>
          )}
        </div>
      </div>
    </DetailDrawer>
  );
}
