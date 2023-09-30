import { extractGarItems, pingUpdater } from "~lib/wayfinder";
import browser, { type Alarms } from "webextension-polyfill";
import { defaultGARCacheURL } from "./gateway";
import type { ProcessedData } from "./types";

/** Cache storage name */
export const CACHE_STORAGE_NAME = "gateways";

/**
 * Get cache of ar.io gateway list
 */
export function getGatewayCache(): ProcessedData[] {
  return JSON.parse(localStorage.getItem(CACHE_STORAGE_NAME));
}

/**
 * Update ar.io gateway list cache
 */
export function updateGatewayCache(gateways: ProcessedData[]) {
  localStorage.setItem(CACHE_STORAGE_NAME, JSON.stringify(gateways));
}

/**
 * Schedule update to gateway list.
 * Refreshes after one day or if in retry mode,
 * it'll attempt to call the alarm again in an hour.
 */
export async function scheduleGatewayUpdate(retry = false) {
  // return if update alarm has already been scheduled
  const gatewayUpdateAlarm = await browser.alarms.get("update_gateway");
  if (!retry && !!gatewayUpdateAlarm) return;

  browser.alarms.create(retry ? "update_gateway_retry" : "update_gateway", {
    [retry ? "when" : "periodInMinutes"]: retry
      ? Date.now() + 60 * 60 * 1000
      : 12 * 60
  });
}

/**
 * Gateway cache update call. Usually called by an alarm,
 * but will also be executed on install.
 */
export async function handleGatewayUpdate(alarm?: Alarms.Alarm) {
  if (
    alarm &&
    !["update_gateway", "update_gateway_retry"].includes(alarm.name)
  ) {
    return;
  }

  const procData: ProcessedData[] = [];

  try {
    // fetch cache
    const data = await (await fetch(defaultGARCacheURL)).json();
    const garItems = extractGarItems(data.gateways);

    // healtcheck
    await pingUpdater(garItems, (newData) => procData.push(newData));

    updateGatewayCache(procData);
  } catch (err) {
    console.log("err in handle", err);

    // schedule to try again
    await scheduleGatewayUpdate(true);
  }
}
