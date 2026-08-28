"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { appConfig } from "@/config/app";

export type HealthResponse = {
  status: string;
  service: string;
  database: string;
  timestamp: string;
};

type HealthCheckState = {
  data: HealthResponse | null;
  loading: boolean;
  error: string | null;
  lastChecked: Date | null;
  lastUpdated: Date | null;
};

const TIMEOUT_MS = 10_000;
const STALE_MS = 60_000;

function isMalformed(body: unknown): body is HealthResponse {
  if (typeof body !== "object" || body === null) return false;
  const obj = body as Record<string, unknown>;
  return (
    typeof obj.status !== "string" ||
    typeof obj.service !== "string" ||
    typeof obj.database !== "string" ||
    typeof obj.timestamp !== "string"
  );
}

function isStale(timestamp: string): boolean {
  try {
    const parsed = Date.parse(timestamp);
    return !Number.isNaN(parsed) && Date.now() - parsed > STALE_MS;
  } catch {
    return true;
  }
}

export function useHealthCheck(pollIntervalMs = 30_000) {
  const [state, setState] = useState<HealthCheckState>({
    data: null,
    loading: true,
    error: null,
    lastChecked: null,
    lastUpdated: null,
  });

  const controllerRef = useRef<AbortController | null>(null);

  const fetchHealth = useCallback(async () => {
    if (controllerRef.current) {
      controllerRef.current.abort();
    }

    const controller = new AbortController();
    controllerRef.current = controller;

    setState((prev) => ({ ...prev, loading: true, error: null }));

    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const res = await fetch(`${appConfig.apiUrl}/health`, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const body: unknown = await res.json();

      if (isMalformed(body)) {
        throw new Error("Malformed response");
      }

      const data = body as HealthResponse;
      const now = new Date();

      let error: string | null = null;
      if (data.status !== "ok") {
        error = `Status: ${data.status}`;
      } else if (data.database !== "ok") {
        error = `Database: ${data.database}`;
      } else if (isStale(data.timestamp)) {
        error = "Stale timestamp";
      }

      setState({
        data,
        loading: false,
        error,
        lastChecked: now,
        lastUpdated: now,
      });
    } catch (err: unknown) {
      clearTimeout(timeoutId);

      if (controller.signal.aborted) {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: "Request timed out",
          lastChecked: new Date(),
        }));
        return;
      }

      const message =
        err instanceof Error ? err.message : "Network error";

      setState((prev) => ({
        ...prev,
        loading: false,
        error: message,
        lastChecked: new Date(),
      }));
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(fetchHealth, 0);

    const interval = setInterval(fetchHealth, pollIntervalMs);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
      controllerRef.current?.abort();
    };
  }, [fetchHealth, pollIntervalMs]);

  return { ...state, refetch: fetchHealth };
}
