"use client";

export type Density = "comfortable" | "compact";

const densityListeners = new Set<() => void>();
const groupByCompanyListeners = new Set<() => void>();

function isDensity(value: string | null): value is Density {
  return value === "comfortable" || value === "compact";
}

export function readDensity(): Density {
  const stored = window.localStorage.getItem("trackr-density");
  return isDensity(stored) ? stored : "comfortable";
}

export function subscribeDensity(onStoreChange: () => void) {
  densityListeners.add(onStoreChange);
  return () => {
    densityListeners.delete(onStoreChange);
  };
}

export function writeDensity(value: Density) {
  window.localStorage.setItem("trackr-density", value);
  for (const listener of densityListeners) listener();
}

export function readGroupByCompany() {
  const stored = window.localStorage.getItem("trackr-group-by-company");
  return stored !== "false";
}

export function subscribeGroupByCompany(onStoreChange: () => void) {
  groupByCompanyListeners.add(onStoreChange);
  return () => {
    groupByCompanyListeners.delete(onStoreChange);
  };
}

export function writeGroupByCompany(value: boolean) {
  window.localStorage.setItem("trackr-group-by-company", String(value));
  for (const listener of groupByCompanyListeners) listener();
}

export function isDensityValue(value: string): value is Density {
  return value === "comfortable" || value === "compact";
}
