"use client";

import { useEffect, useState } from "react";
import { TopNav } from "@/components/layout/TopNav";
import { JobsTimelineView } from "@/components/jobs/JobsTimelineView";
import { VolumetryMatrixView } from "@/components/kafka/VolumetryMatrixView";
import { MOCK_CONTROLM_JOBS } from "@/data/mock-controlm";
import { MOCK_KAFKA_DATABRICKS_PAIRS } from "@/data/mock-kafka-databricks";
import type { EnvironmentFilter, MonitorTab } from "@/types/monitoring";

export function ObservabilityApp() {
  const [envFilter, setEnvFilter] = useState<EnvironmentFilter>("prd");
  const [activeTab, setActiveTab] = useState<MonitorTab>("jobs");
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [jobSearch, setJobSearch] = useState("");
  const [kafkaSearch, setKafkaSearch] = useState("");

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [theme]);

  const searchValue = activeTab === "jobs" ? jobSearch : kafkaSearch;
  const onSearchChange = activeTab === "jobs" ? setJobSearch : setKafkaSearch;
  const searchPlaceholder =
    activeTab === "jobs"
      ? "Buscar por job name, pasta ou processo personalizado..."
      : "Buscar por tópico Kafdrop ou tabela Databricks...";

  return (
    <div className="mx-auto w-full max-w-[1440px] flex-1 space-y-6 px-4 py-6 sm:px-6">
      <TopNav
        env={envFilter}
        onEnvChange={setEnvFilter}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        theme={theme}
        onToggleTheme={() =>
          setTheme((prev) => (prev === "dark" ? "light" : "dark"))
        }
        searchValue={searchValue}
        onSearchChange={onSearchChange}
        searchPlaceholder={searchPlaceholder}
      />

      <main>
        {activeTab === "jobs" ? (
          <JobsTimelineView
            jobs={MOCK_CONTROLM_JOBS}
            envFilter={envFilter}
            searchQuery={jobSearch}
          />
        ) : (
          <VolumetryMatrixView
            pairs={MOCK_KAFKA_DATABRICKS_PAIRS}
            envFilter={envFilter}
            searchQuery={kafkaSearch}
          />
        )}
      </main>
    </div>
  );
}
