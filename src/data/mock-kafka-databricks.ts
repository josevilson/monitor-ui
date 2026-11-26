import type { DailyVolumePoint, KafkaDatabricksPair } from "@/types/monitoring";

export const VOLUMETRY_DATES_ISO = [
  "2026-11-12",
  "2026-11-13",
  "2026-11-14",
  "2026-11-15",
  "2026-11-16",
  "2026-11-17",
  "2026-11-18",
  "2026-11-19",
  "2026-11-20",
  "2026-11-21",
  "2026-11-22",
  "2026-11-23",
  "2026-11-24",
  "2026-11-25",
];

function buildDailySeries(
  baseVolume: number,
  overrides: Record<number, Partial<DailyVolumePoint>> = {}
): DailyVolumePoint[] {
  return VOLUMETRY_DATES_ISO.map((dateIso, idx) => {
    const isWeekend = idx === 2 || idx === 3 || idx === 9 || idx === 10;
    const factor = isWeekend ? 0.78 : 1 + ((idx % 5) - 2) * 0.04;
    const defaultVal = Math.round(baseVolume * factor);
    const ov = overrides[idx] ?? {};

    return {
      dateIso,
      kafdropCount: ov.kafdropCount ?? defaultVal,
      databricksCount: ov.databricksCount ?? defaultVal,
      status: ov.status ?? "OK",
    };
  });
}

export const MOCK_KAFKA_DATABRICKS_PAIRS: KafkaDatabricksPair[] = [
  // ======================== PRD PAIRS ========================
  {
    id: "k1-prd",
    env: "prd",
    monitoredEnvs: ["prd", "hk"],
    topic: "prod.payments.pix.events.v2",
    tableName: "prod_catalog.payments.pix_events",
    consumerGroup: "dbx-autoloader-pix-prd",
    lagStatus: "OK",
    lagLabel: "Em dia (2m lag)",
    schemaStatus: "DRIFT",
    schemaLabel: "2 ausentes no DBX",
    volumeStatus: "OK",
    linkedJobs: ["CM_PIX_SETTLEMENT_SYNC"],
    daily: buildDailySeries(1400000, {
      12: { kafdropCount: 1520000, databricksCount: 1519950, status: "OK" },
      13: { kafdropCount: 1490000, databricksCount: 1489800, status: "OK" },
    }),
    schemaDiff: [
      { column: "event_id", inKafdrop: true, inDatabricks: true, state: "MATCH" },
      { column: "amount_cents", inKafdrop: true, inDatabricks: true, state: "MATCH" },
      { column: "payer_ispb", inKafdrop: true, inDatabricks: true, state: "MATCH" },
      {
        column: "device_fingerprint",
        inKafdrop: true,
        inDatabricks: false,
        state: "MISSING_DBX",
        detectedAt: "24/11 18:22",
      },
      {
        column: "pix_modality",
        inKafdrop: true,
        inDatabricks: false,
        state: "MISSING_DBX",
        detectedAt: "25/11 09:10",
      },
    ],
  },
  {
    id: "k2-prd",
    env: "prd",
    monitoredEnvs: ["prd"],
    topic: "prod.cards.transactions.raw",
    tableName: "prod_catalog.cards.transactions_bronze",
    consumerGroup: "dbx-spark-cards-prd",
    lagStatus: "LAG",
    lagLabel: "Atrasado +1 dia",
    schemaStatus: "SYNCED",
    schemaLabel: "Schema OK",
    volumeStatus: "VOLUME_DIFF",
    linkedJobs: ["CM_INGEST_CARDS_TX", "CM_CONSOLIDATE_CARDS"],
    daily: buildDailySeries(940000, {
      12: { kafdropCount: 1020000, databricksCount: 615000, status: "DIFF" },
      13: { kafdropCount: 995000, databricksCount: 0, status: "LAG" },
    }),
    schemaDiff: [
      { column: "tx_id", inKafdrop: true, inDatabricks: true, state: "MATCH" },
      { column: "merchant_mcc", inKafdrop: true, inDatabricks: true, state: "MATCH" },
      { column: "card_bin", inKafdrop: true, inDatabricks: true, state: "MATCH" },
      { column: "auth_amount", inKafdrop: true, inDatabricks: true, state: "MATCH" },
    ],
  },
  {
    id: "k3-prd",
    env: "prd",
    monitoredEnvs: ["prd", "hk"],
    topic: "prod.crm.customer.profile.cdc",
    tableName: "prod_catalog.crm.customers_raw",
    consumerGroup: "dbx-cdc-customers-prd",
    lagStatus: "OK",
    lagLabel: "Em dia (45s lag)",
    schemaStatus: "DRIFT",
    schemaLabel: "1 ausente no Kafdrop",
    volumeStatus: "OK",
    linkedJobs: ["CM_CRM_CUSTOMERS_DELTA", "CM_CRM_SEGMENTS_REFRESH"],
    daily: buildDailySeries(220000),
    schemaDiff: [
      { column: "customer_id", inKafdrop: true, inDatabricks: true, state: "MATCH" },
      {
        column: "legacy_segment_id",
        inKafdrop: false,
        inDatabricks: true,
        state: "MISSING_KAFDROP",
        detectedAt: "25/11 03:40",
      },
      { column: "opt_in_lgpd", inKafdrop: true, inDatabricks: true, state: "MATCH" },
    ],
  },
  {
    id: "k4-prd",
    env: "prd",
    monitoredEnvs: ["prd"],
    topic: "prod.fraud.alerts.stream",
    tableName: "prod_catalog.security.fraud_alerts",
    consumerGroup: "dbx-fraud-alerts-prd",
    lagStatus: "OK",
    lagLabel: "Em dia (12s lag)",
    schemaStatus: "SYNCED",
    schemaLabel: "Schema OK",
    volumeStatus: "OK",
    linkedJobs: [],
    daily: buildDailySeries(48000),
    schemaDiff: [
      { column: "alert_id", inKafdrop: true, inDatabricks: true, state: "MATCH" },
      { column: "risk_level", inKafdrop: true, inDatabricks: true, state: "MATCH" },
      { column: "score", inKafdrop: true, inDatabricks: true, state: "MATCH" },
    ],
  },

  // ======================== HK (HOMOLOGAÇÃO) PAIRS ========================
  {
    id: "k1-hk",
    env: "hk",
    monitoredEnvs: ["prd", "hk"],
    topic: "hk.payments.pix.events.v2",
    tableName: "hk_catalog.payments.pix_events",
    consumerGroup: "dbx-autoloader-pix-hk",
    lagStatus: "OK",
    lagLabel: "Em dia (30s lag)",
    schemaStatus: "SYNCED",
    schemaLabel: "Schema OK (Evoluído em HK)",
    volumeStatus: "OK",
    linkedJobs: [],
    daily: buildDailySeries(19500),
    schemaDiff: [
      { column: "event_id", inKafdrop: true, inDatabricks: true, state: "MATCH" },
      { column: "amount_cents", inKafdrop: true, inDatabricks: true, state: "MATCH" },
      { column: "payer_ispb", inKafdrop: true, inDatabricks: true, state: "MATCH" },
      { column: "device_fingerprint", inKafdrop: true, inDatabricks: true, state: "MATCH" },
      { column: "pix_modality", inKafdrop: true, inDatabricks: true, state: "MATCH" },
    ],
  },
  {
    id: "k2-hk",
    env: "hk",
    monitoredEnvs: ["hk"],
    topic: "hk.openfinance.consents.v3",
    tableName: "hk_catalog.openfinance.consents_raw",
    consumerGroup: "dbx-openfinance-v3-hk",
    lagStatus: "LAG",
    lagLabel: "Atrasado +1 dia",
    schemaStatus: "DRIFT",
    schemaLabel: "1 ausente no DBX",
    volumeStatus: "VOLUME_DIFF",
    linkedJobs: ["CM_OPENFINANCE_V3_BETA"],
    daily: buildDailySeries(4400, {
      12: { kafdropCount: 6100, databricksCount: 4200, status: "DIFF" },
      13: { kafdropCount: 5800, databricksCount: 0, status: "LAG" },
    }),
    schemaDiff: [
      { column: "consent_id", inKafdrop: true, inDatabricks: true, state: "MATCH" },
      {
        column: "consent_scope_v3",
        inKafdrop: true,
        inDatabricks: false,
        state: "MISSING_DBX",
        detectedAt: "25/11 08:15",
      },
    ],
  },
  {
    id: "k3-hk",
    env: "hk",
    monitoredEnvs: ["prd", "hk"],
    topic: "hk.crm.customer.profile.cdc",
    tableName: "hk_catalog.crm.customers_raw",
    consumerGroup: "dbx-cdc-customers-hk",
    lagStatus: "OK",
    lagLabel: "Em dia (15s lag)",
    schemaStatus: "SYNCED",
    schemaLabel: "Schema OK",
    volumeStatus: "OK",
    linkedJobs: ["CM_CRM_CUSTOMERS_DELTA"],
    daily: buildDailySeries(12000),
    schemaDiff: [
      { column: "customer_id", inKafdrop: true, inDatabricks: true, state: "MATCH" },
      { column: "legacy_segment_id", inKafdrop: true, inDatabricks: true, state: "MATCH" },
      { column: "opt_in_lgpd", inKafdrop: true, inDatabricks: true, state: "MATCH" },
    ],
  },
];
