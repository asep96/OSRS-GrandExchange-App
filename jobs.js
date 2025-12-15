const { saveLatestPricesBulk, saveIntervalSnapshotsBulk } = require("./db/index.js");

const WIKI_BASE = "https://prices.runescape.wiki/api/v1/osrs";

const USER_AGENT = process.env.USER_AGENT;

const WIKI_HEADERS = {
  "User-Agent": USER_AGENT,
  "Accept": "application/json",
};

//refresh latest_prices from /5m
async function refreshLatestPricesJob() {
  const url = `${WIKI_BASE}/5m`;

  const res = await fetch(url, { headers: WIKI_HEADERS });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Wiki 5m failed: ${res.status} ${text}`);
  }

  const body = await res.json();
  const data = body.data || {};

  // Turn the map { "4151": {avgHighPrice,...}, ... } into an array for the DB helper
  const rows = Object.entries(data).map(([idStr, row]) => ({
    item_id: Number(idStr),
    high: row.avgHighPrice ?? null,
    low: row.avgLowPrice ?? null,
    highTime: null,
    lowTime: null,
  }));

  await saveLatestPricesBulk(rows);

  return { updatedCount: rows.length };
}

//refresh interval_snapshots from /5m, /1h, /24h

async function refreshIntervalSnapshotsJob() {
  const timesteps = ["5m", "1h", "24h"];
  const snapshotsByItem = new Map();

  for (const step of timesteps) {
    const url = `${WIKI_BASE}/${step}`;
    const res = await fetch(url, { headers: WIKI_HEADERS });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Wiki ${step} failed: ${res.status} ${text}`);
    }

    const body = await res.json();
    const data = body.data || {};

    for (const [idStr, row] of Object.entries(data)) {
      const itemId = Number(idStr);
      if (!Number.isFinite(itemId)) continue;

      const snapshot = snapshotsByItem.get(itemId) || { itemId };

      if (step === "5m") {
        snapshot.avgHighPrice5m       = row.avgHighPrice ?? null;
        snapshot.avgHighVolume5m      = row.highPriceVolume ?? null;
        snapshot.avgLowPrice5m        = row.avgLowPrice ?? null;
        snapshot.avgLowVolume5m       = row.lowPriceVolume ?? null;
      } else if (step === "1h") {
        snapshot.avgHighPrice1h       = row.avgHighPrice ?? null;
        snapshot.avgHighVolume1h      = row.highPriceVolume ?? null;
        snapshot.avgLowPrice1h        = row.avgLowPrice ?? null;
        snapshot.avgLowVolume1h       = row.lowPriceVolume ?? null;
      } else if (step === "24h") {
        snapshot.avgHighPrice24h      = row.avgHighPrice ?? null;
        snapshot.avgHighVolume24h     = row.highPriceVolume ?? null;
        snapshot.avgLowPrice24h       = row.avgLowPrice ?? null;
        snapshot.avgLowVolume24h      = row.lowPriceVolume ?? null;
      }

      snapshotsByItem.set(itemId, snapshot);
    }
  }

  const snapshotsArray = Array.from(snapshotsByItem.values());

  await saveIntervalSnapshotsBulk(snapshotsArray);

  return { updatedCount: snapshotsArray.length };
}

//helper function to run both jobs
async function runAllRefreshJobs() {
  const prices = await refreshLatestPricesJob();
  const snapshots = await refreshIntervalSnapshotsJob();

  return {
    pricesUpdated: prices.updatedCount,
    snapshotsUpdated: snapshots.updatedCount,
  };
}

module.exports = {
    runAllRefreshJobs

}
