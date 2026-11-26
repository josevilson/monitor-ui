export type Environment = "prd" | "hk";
export type EnvironmentFilter = Environment | "all";

export type MonitorTab = "jobs" | "kafka";

export type JobStatus = "OK" | "NOT_OK" | "RUNNING" | "PENDING" | "HELD";

export type JobGrouping = "process" | "folder" | "job";
export type TimelineAxisMode = "ODATE" | "EXEC";

export interface ControlMJobRun {
  dateIso: string;
  odateIso: string;
  status: JobStatus;
  durationSec: number | null;
  anomaly?: boolean;
  startTime?: string;
  endTime?: string;
  orderId: string;
  waitingFor?: string;
  logSnippet: string;
}

export interface ControlMJob {
  id: string;
  env: Environment;
  monitoredEnvs: Environment[];
  jobName: string;
  folder: string;
  processName: string;
  host: string;
  avgDurationSec: number;
  runs: ControlMJobRun[];
}

export type VolumetryDayStatus = "OK" | "DIFF" | "LAG";

export interface DailyVolumePoint {
  dateIso: string;
  kafdropCount: number;
  databricksCount: number;
  status: VolumetryDayStatus;
}

export type SchemaColumnState = "MATCH" | "MISSING_DBX" | "MISSING_KAFDROP";

export interface SchemaColumnDiff {
  column: string;
  inKafdrop: boolean;
  inDatabricks: boolean;
  state: SchemaColumnState;
  detectedAt?: string;
}

export interface KafkaDatabricksPair {
  id: string;
  env: Environment;
  monitoredEnvs: Environment[];
  topic: string;
  tableName: string;
  consumerGroup: string;
  lagStatus: "OK" | "LAG";
  lagLabel: string;
  schemaStatus: "SYNCED" | "DRIFT";
  schemaLabel: string;
  volumeStatus: "OK" | "VOLUME_DIFF";
  linkedJobs: string[];
  daily: DailyVolumePoint[];
  schemaDiff: SchemaColumnDiff[];
}
