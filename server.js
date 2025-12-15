const path = require("path");
const express = require("express");
const cors = require("cors");
const { 
    getLatestPrice, 
    saveLatestPrice, 
    saveLatestPricesBulk,
    saveItemsBulk,
    searchItemsByName,
    getItemProfileById,
    getMostExpensiveItems,
    getTopSpreads,
    getTopAlch,
    saveItemIntervalSnapshotsBulk
} = require("./db"); 
const { runAllRefreshJobs } = require("./jobs");

const app = express();

const PORT = process.env.PORT || 3000;
const CRON_SECRET = process.env.CRON_SECRET;
const USER_AGENT = process.env.USER_AGENT;

const MAPPING_URL = "https://prices.runescape.wiki/api/v1/osrs/mapping";
const LATEST_URL = "https://prices.runescape.wiki/api/v1/osrs/latest";
const FIVE_MIN_URL = "https://prices.runescape.wiki/api/v1/osrs/5m";
const ONE_HOUR_URL = "https://prices.runescape.wiki/api/v1/osrs/1h";
const TWENTYFOUR_HOUR_URL = "https://prices.runescape.wiki/api/v1/osrs/24h";

app.use(cors());

const publicPath = path.join(__dirname, "public");
app.use(express.static(publicPath));

/******************************************/
/**Helper Functions************************/
/******************************************/

//used when /api/items/search is called
async function fetchMapping() {
    const response = await fetch(MAPPING_URL, {
        headers: {
            "User-Agent": USER_AGENT
        }
    });

    if (!response.ok) {
        throw new Error(`Mapping request failed: ${response.status} ${response.statusText}`);
    }

    //data is an array of item objects
    const data = await response.json()
    
    return data;
}

function parseSqliteUtcDate(dateStr) {
    if (!dateStr) return null;

    const iso = dateStr.replace(" ", "T") + "Z";
    const d = new Date(iso);

    if (Number.isNaN(d.getTime())) {
        return null;
    }

    return d; 
}


/******************************************/
/**ROUTES**********************************/
/******************************************/
// Simple test route and healthcheck
app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
});

//runs all jobs to update market info
app.post("/api/admin/tasks/refresh-market", async (req, res) => {
  if (CRON_SECRET && req.query.secret !== CRON_SECRET) {
    return res.status(403).json({ ok: false, error: "forbidden" });
  }

  try {
    const result = await runAllRefreshJobs();
    res.json({ ok: true, ...result });
  } catch (err) {
    console.error("[cron] refresh failed:", err);
    res.status(500).json({ ok: false, error: "refresh_failed" });
  }
});

//pulls item information including id, name, isMembers, examineDesc, highAlch, lowAlch
app.get("/api/items/search", (req, res) => {
    try {
        const raw = req.query.query;

        if (typeof raw !== "string") {
        return res.status(400).json({ error: "Invalid 'query' parameter" });
        }

        const query = raw.trim();

        if (!query) {
        return res.status(400).json({ error: "Missing 'query' parameter" });
        }

        // simple length cap to prevent huge inputs into db
        if (query.length > 64) {
        return res.status(400).json({ error: "Query too long (max 64 chars)" });
        }

        const safeQuery = query.replace(/[^\p{L}\p{N}\s'(),\-:]/gu, "");

        const results = searchItemsByName(safeQuery);

        res.json({
            query,
            count: results.length,
            results: results.map((item) => ({
                id: item.id,
                name: item.name,
                members: !!item.members,
                examine: item.examine,
                highalch: item.highalch,
                lowalch: item.lowalch,
                itemLimit: item.itemLimit
            }))
        });
    } catch (err) {
        console.error("Error in /api/items/search:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});


//gets latest items 
app.get("/api/items/latest", (req, res) => {

    const itemId = req.query.id;
    if (!itemId) {
        return res.status(400).json({ error: "Missing 'id' query parameter" });
    }

    const numericId = Number(itemId);
    if (Number.isNaN(numericId)) {
        return res.status(400).json({ error: "Invalid 'id' query parameter" });
    }

    const cached = getLatestPrice(numericId);

    if (!cached) {

        return res.status(404).json({
            error: `No cached price data for item ${numericId}`,
            source: "none"
        });
    }

    const fresh = isCacheFresh ? isCacheFresh(cached.updated_at, 10) : true;;
    
    return res.json({
        id: cached.item_id,
        high: cached.high,
        low: cached.low,
        highTime: cached.high_time,
        lowTime: cached.low_time,
        source: "cache",
        isFresh: fresh
    });  
});

// GET /api/items/profile?id=123
app.get("/api/items/profile", (req, res) => {
    try {
        const rawId = req.query.id;
        const id = parseInt(rawId, 10);

        if (!rawId || Number.isNaN(id)) {
            return res.status(400).json({ error: "Missing or invalid 'id' parameter" });
        }

        const item = getItemProfileById(id);

        if (!item) {
            return res.status(404).json({ error: "Item not found" });
        }

        res.json({
                              id: item.id,
                            name: item.name,
                         members: !!item.members,
                         examine: item.examine,
                        highalch: item.highalch,
                         lowalch: item.lowalch,
                            high: item.high,
                             low: item.low,
                       high_time: item.high_time,
                        low_time: item.low_time,
                           limit: item.itemLimit,
                  avgHighPrice5m: item.avgHighPrice5m,
            avgHighPriceVolume5m: item.avgHighPriceVolume5m,
                   avgLowPrice5m: item.avgLowPrice5m,
             avgLowPriceVolume5m: item.avgLowPriceVolume5m,
                  avgHighPrice1h: item.avgHighPrice1h,
            avgHighPriceVolume1h: item.avgHighPriceVolume1h,
                   avgLowPrice1h: item.avgLowPrice1h,
             avgLowPriceVolume1h: item.avgLowPriceVolume1h,
                 avgHighPrice24h: item.avgHighPrice24h,
           avgHighPriceVolume24h: item.avgHighPriceVolume24h,
                  avgLowPrice24h: item.avgLowPrice24h,
            avgLowPriceVolume24h: item.avgLowPriceVolume24h,
                       updatedAt: item.updated_at,
        });
    } catch (err) {
        console.error("Error in /api/items/profile:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

//refresh prices in database
app.get("/api/admin/refresh-prices", async (req, res) => {
    try {

        const response = await fetch(LATEST_URL, {
            headers: { "User-Agent": USER_AGENT }
        });
        
        if (!response.ok) {
            console.error(
                "[BULK REFRESH] OSRS API error: ",
                response.status,
                response.statusText
            );
            return res
                .status(502)
                .json({ error: "Failed to fetch latest bulk prices from OSRS Wiki API" });
        }

        const data = await response.json();

        //expecting data.data to be an object: { "4151": { high, low, highTime, lowTime }, ... }
        const entries = Object.entries(data.data || {});

        //map into the shape our DB helper expects
        const itemsForDb = entries.map(([id, itemData]) => ({
            item_id: Number(id),
            high: itemData.high,
            low: itemData.low,
            high_time: itemData.highTime,
            low_time: itemData.lowTime
        }));

        //save them in a single transaction
        saveLatestPricesBulk(itemsForDb);

        res.json({
            updatedCount: itemsForDb.length,
            message: "Bulk price refresh completed"
        });

    } catch (err) {
        console.error("[BULK REFRESH] Error during bulk refresh:", err);
        res.status(500).json({ error: "Internal server error during bulk refresh" });
    }
});

//refresh item info
app.get("/api/admin/refresh-mapping", async (req, res) => {
    try {
        const response = await fetch(MAPPING_URL, {
            headers: { "User-Agent": USER_AGENT }
        });

        if (!response.ok) {
            console.error(
                "[MAPPING REFRESH] OSRS API error:",
            response.status,
            response.statusText
        );

        return res
            .status(502)
            .json({ error: "Failed to fetch mapping from OSRS Wiki API" });
        }

        const data = await response.json();

        const itemsForDb = data.map((item) => ({
            id: item.id,
            name: item.name,
            members: item.members ? 1 : 0,
            examine: item.examine ?? null,
            highalch: item.highalch ?? null,
            lowalch: item.lowalch ?? null,
            itemLimit: item.limit ?? null,
        }));

        saveItemsBulk(itemsForDb);

        res.json({
            updatedCount: itemsForDb.length,
            message: "Mapping refresh completed"
        });
    } catch (err) {
        console.error("[MAPPING REFRESH] Error during mapping refresh:", err);
        res.status(500).json({ error: "Internal server error during mapping refresh" });
    }
});

//route for refreshing snapshot intervals for daily, hourly, and 5min activity
app.get("/api/admin/refresh-snapshot-intervals", async (req, res) => {
    try {

        //get the 5 min interval 
        const fiveMinResponse = await fetch(FIVE_MIN_URL, {
            headers: { "User-Agent": USER_AGENT }
        });

        if (!fiveMinResponse.ok) {
            console.error(
                "Five Min Interval OSRS API error:",
            fiveMinResponse.status,
            fiveMinResponse.statusText
        );

        return res
            .status(502)
            .json({ error: "Failed to fetch interval snapshots from OSRS Wiki API" });
        }

        const fiveMinData = await fiveMinResponse.json();

        //get the 1 hour interval
        const oneHourResponse = await fetch(ONE_HOUR_URL, {
            headers: { "User-Agent": USER_AGENT }
        });

        if (!oneHourResponse.ok) {
            console.error(
                "Five Min Interval OSRS API error:",
            oneHourResponse.status,
            oneHourResponse.statusText
        );

        return res
            .status(502)
            .json({ error: "Failed to fetch interval snapshots from OSRS Wiki API" });
        }

        const oneHourData = await oneHourResponse.json();

        //get the 24 hour interval 
        const twentyFourHourResponse = await fetch(TWENTYFOUR_HOUR_URL, {
            headers: { "User-Agent": USER_AGENT }
        });

        if (!twentyFourHourResponse.ok) {
            console.error(
                "24 Hour Interval OSRS API error:",
            twentyFourHourResponse.status,
            twentyFourHourResponse.statusText
        );

        return res
            .status(502)
            .json({ error: "Failed to fetch interval snapshots from OSRS Wiki API" });
        }

        const twentyFourHourData = await twentyFourHourResponse.json();

        //get all our IDs that were returned and add them to a set
        const itemIds = new Set();

        const dataIds5m = fiveMinData.data;
        const dataIds1h = oneHourData.data;
        const dataIds24h = twentyFourHourData.data;

        //grab item IDs from our snapshots and add them to the set 
        Object.keys(dataIds5m).forEach((id) => itemIds.add(id));
        Object.keys(dataIds1h).forEach((id) => itemIds.add(id));
        Object.keys(dataIds24h).forEach((id) => itemIds.add(id));

        
        const snapshotItemsForDb = Array.from(itemIds).map((id) => {
            const snap5m  = dataIds5m[id]  || {};
            const snap1h  = dataIds1h[id]  || {};
            const snap24h = dataIds24h[id] || {};

            return {
                item_id: Number(id),

                avgHighPrice5m:         snap5m.avgHighPrice            ?? null,
                avgHighPriceVolume5m:   snap5m.highPriceVolume         ?? null,
                avgLowPrice5m:          snap5m.avgLowPrice             ?? null,
                avgLowPriceVolume5m:    snap5m.lowPriceVolume          ?? null,

                avgHighPrice1h:         snap1h.avgHighPrice            ?? null,
                avgHighPriceVolume1h:   snap1h.highPriceVolume         ?? null,
                avgLowPrice1h:          snap1h.avgLowPrice             ?? null,
                avgLowPriceVolume1h:    snap1h.lowPriceVolume          ?? null,

                avgHighPrice24h:        snap24h.avgHighPrice           ?? null,
                avgHighPriceVolume24h:  snap24h.highPriceVolume        ?? null,
                avgLowPrice24h:         snap24h.avgLowPrice            ?? null,
                avgLowPriceVolume24h:   snap24h.lowPriceVolume         ?? null,
            };
        });

        saveItemIntervalSnapshotsBulk(snapshotItemsForDb);

        res.json({
            updatedCount: snapshotItemsForDb.length,
            message: "Interval Snapshot refresh completed"
        });
    } catch (err) {
        console.error("[MAPPING REFRESH] Error during snapshot refresh:", err);
        res.status(500).json({ error: "Internal server error during snapshot refresh" });
    }
});

//route for most expensive items
app.get("/api/home/top-expensive", (req, res) => {
    try {

        const mostExpensiveItems = getMostExpensiveItems();

        res.json({
            count: mostExpensiveItems.length,
            results: mostExpensiveItems
        });

    } catch (err) {
        res.status(500).json({error: "Internal server error during most expensive items data pull"})
    }
});

//route for getting items with highest bid-ask spreads
app.get("/api/home/top-spread", (req, res) => {
    try {
        const topSpreads = getTopSpreads();

        res.json({
            count: topSpreads.length,
            results: topSpreads
        })

    } catch (err) {
        res.status(500).json({error: "Internal server error during top spread data pull"})
    }
});

//route for getting items with highest high-alch profits
app.get("/api/home/top-alch", async (req, res) => {
    try {
        const topAlch = getTopAlch();

        res.json({
            count: topAlch.length,
            results: topAlch
        })

    } catch (err) {
        res.status(500).json({error: "Internal server error during top alch data pull"})
    }
});

//route for getting item price history for chart
app.get("/api/items/history", async (req, res) => {
    try {
        
        const itemIdRaw = req.query.id;
        const timestepRaw = (req.query.timestep || "5m").toLowerCase();

        const itemId = Number.parseInt(itemIdRaw, 10);
        if(!itemIdRaw || Number.isNaN(itemId)) {
            return res.status(400).json({ error: "Missing or invalid 'id' query paramter" });
        }

        const allowedSteps = new Set(["5m", "1h", "6h", "24h"]);

        if (!allowedSteps.has(timestepRaw)) {
            return res.status(400).json({
                error: "Invalid 'timestep'. Allowed values: 5m, 1h, 6h, 24h",
            });
        }

        const url = `https://prices.runescape.wiki/api/v1/osrs/timeseries?id=${itemId}&timestep=${timestepRaw}`;

        const apiRes = await fetch(url, {
            headers: {
                "User-Agent": USER_AGENT,
                "Accept": "application/json",
            },
        });

        if (!apiRes.ok) {
            const text = await apiRes.text();
            console.error("OSRS timeseries error:", apiRes.status, text);
            return res.status(502).json({
                error: "Upstream OSRS API error",
                status: apiRes.status,
            });
        }

        const raw = await apiRes.json();

        //an array containing all our data points
        const rawPoints = Array.isArray(raw) ? raw : raw.data || [];

        const points = rawPoints.map((p) => {
            const timestampSec = p.timestamp;
            const avgHigh = p.avgHighPrice ?? null;
            const avgLow = p.avgLowPrice ?? null;
            const highVolume = p.highPriceVolume ?? null;
            const lowVolume = p.lowPriceVolume ?? null;

            const ts = typeof timestampSec === "number" ? timestampSec * 1000 : null;

            let mid = null; 

            if (typeof avgHigh === "number" && typeof avgLow === "number") {
                mid = (avgHigh + avgLow) / 2;
            }

            let totalVolume = null; 
            let vwap = null;

            if(typeof highVolume === "number" && typeof lowVolume === "number") {
                const total = highVolume + lowVolume;

                if (total > 0) {
                    totalVolume = total; 
                }

                const highValue = 
                    typeof avgHigh === "number" ? avgHigh * highVolume : 0;
                const lowValue = 
                    typeof avgLow === "number" ? avgLow * lowVolume : 0;

                const vwapCandidate = (highValue + lowValue) / total;

                if(Number.isFinite(vwapCandidate)) {
                    vwap = Math.round(vwapCandidate);
                }
            }

            if (vwap == null && mid != null) {
                vwap = Math.round(mid);
            }

            return {
                ts, 
                avgHigh, 
                avgLow,
                mid,
                highVolume,
                lowVolume,
                totalVolume,
                vwap
            };
        });

        res.json({
            id: itemId,
            timestep: timestepRaw,
            points,
        });
    } catch (err) {
        console.error("Error in /api/items/history:", err);
        res.status(500).json({error: "Internal server error during item history pull"});
    }
});

app.listen(PORT, "0.0.0.0", () => {

});

module.exports = app;