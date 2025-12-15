const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");

//path to SQLite file and create if it doesn't exist
const dbFile = path.join(__dirname, "prices.db");
const db = new Database(dbFile);

//run schema.sql to ensure tables exist
const schemaPath = path.join(__dirname, "schema.sql");
const schema = fs.readFileSync(schemaPath, "utf8");
db.exec(schema);

//prepare statements
const getLatestStatement = db.prepare(`
    SELECT
        item_id,
        high,
        low,
        high_time,
        low_time,
        updated_at
    FROM
        latest_prices
    WHERE  
        item_id = ?    
`);

function getLatestPrice(itemId) {
    //return row object or undefined
    return getLatestStatement.get(itemId);
}

const upsertLatestStatement = db.prepare(`
    INSERT INTO latest_prices  
        (
            item_id, 
            high,
            low,
            high_time,
            low_time,
            updated_at
        )
    VALUES
        (
            @item_id, 
            @high,
            @low,
            @high_time,
            @low_time,
            datetime('now')
        )    
    ON CONFLICT (item_id) DO UPDATE SET
        high       = excluded.high,
        low        = excluded.low,
        high_time  = excluded.high_time,
        low_time   = excluded.low_time,
        updated_at = datetime('now');

`);

const bulkUpsertLatest = db.transaction((items) => {
    for (const item of items) {
        upsertLatestStatement.run(item);
    }
});

function saveLatestPricesBulk(items) {
    bulkUpsertLatest(items);
}

function saveLatestPrice({ item_id, high, low, high_time, low_time }) {
    upsertLatestStatement.run({ item_id, high, low, high_time, low_time });
}


const upsertItemStatement = db.prepare(`
  INSERT INTO items 
    (
        id, 
        name, 
        members, 
        examine, 
        highalch, 
        lowalch,
        itemLimit, 
        updated_at
    )
  VALUES 
    (
        @id, 
        @name, 
        @members, 
        @examine, 
        @highalch, 
        @lowalch,
        @itemLimit, 
        datetime('now')
    )
  ON CONFLICT(id) DO UPDATE SET
    name       = excluded.name,
    members    = excluded.members,
    examine    = excluded.examine,
    highalch   = excluded.highalch,
    lowalch    = excluded.lowalch,
    itemLimit  = excluded.itemLimit,
    updated_at = datetime('now')
`);


const bulkUpsertItems = db.transaction((items) => {
    for (const item of items) {
        upsertItemStatement.run(item);
    }
})

function saveItemsBulk(items) {
    bulkUpsertItems(items);
}

const upsertItemIntervalSnapshotsStatement = db.prepare(`
    INSERT INTO item_interval_snapshots
    (
        item_id,
        avgHighPrice5m,
        avgHighPriceVolume5m,
        avgLowPrice5m,
        avgLowPriceVolume5m,
        avgHighPrice1h,
        avgHighPriceVolume1h,
        avgLowPrice1h,
        avgLowPriceVolume1h,
        avgHighPrice24h,
        avgHighPriceVolume24h,
        avgLowPrice24h,
        avgLowPriceVolume24h,
        updated_at
    )
    VALUES
    (
        @item_id,
        @avgHighPrice5m,
        @avgHighPriceVolume5m,
        @avgLowPrice5m,
        @avgLowPriceVolume5m,
        @avgHighPrice1h,
        @avgHighPriceVolume1h,
        @avgLowPrice1h,
        @avgLowPriceVolume1h,
        @avgHighPrice24h,
        @avgHighPriceVolume24h,
        @avgLowPrice24h,
        @avgLowPriceVolume24h,
        datetime('now')
    )
    ON CONFLICT(item_id) DO UPDATE SET
        avgHighPrice5m         = excluded.avgHighPrice5m,
        avgHighPriceVolume5m   = excluded.avgHighPriceVolume5m,
        avgLowPrice5m          = excluded.avgLowPrice5m,
        avgLowPriceVolume5m    = excluded.avgLowPriceVolume5m,
        avgHighPrice1h         = excluded.avgHighPrice1h,
        avgHighPriceVolume1h   = excluded.avgHighPriceVolume1h,
        avgLowPrice1h          = excluded.avgLowPrice1h,
        avgLowPriceVolume1h    = excluded.avgLowPriceVolume1h,
        avgHighPrice24h        = excluded.avgHighPrice24h,
        avgHighPriceVolume24h  = excluded.avgHighPriceVolume24h,
        avgLowPrice24h         = excluded.avgLowPrice24h,
        avgLowPriceVolume24h   = excluded.avgLowPriceVolume24h,
        updated_at             = datetime('now')
`)

const bulkUpsertItemIntervalSnapshots = db.transaction((items) => {
    for (const item of items) {
        upsertItemIntervalSnapshotsStatement.run(item);
    }
})

function saveItemIntervalSnapshotsBulk(items) {
    bulkUpsertItemIntervalSnapshots(items);
}

const searchItemsByNameStatement = db.prepare(`
    SELECT 
        id, 
        name, 
        members, 
        examine, 
        highalch, 
        lowalch,
        itemLimit
    FROM 
        items
    WHERE 
        LOWER(name) LIKE LOWER(@pattern)
    ORDER BY 
        name
    LIMIT 25
`); 

function searchItemsByName(query) {
    return searchItemsByNameStatement.all({ pattern: `%${query}%` });
}

const getItemProfileStatement = db.prepare(`
    SELECT
        i.id,
        i.name,
        i.members,
        i.examine,
        i.highalch,
        i.lowalch,
        i.itemLimit,
        lp.high,
        lp.low,
        lp.high_time,
        lp.low_time,
        iis.avgHighPrice5m,
        iis.avgHighPriceVolume5m,
        iis.avgLowPrice5m,
        iis.avgLowPriceVolume5m,
        iis.avgHighPrice1h,
        iis.avgHighPriceVolume1h,
        iis.avgLowPrice1h,
        iis.avgLowPriceVolume1h,
        iis.avgHighPrice24h,
        iis.avgHighPriceVolume24h,
        iis.avgLowPrice24h,
        iis.avgLowPriceVolume24h,
        lp.updated_at
    FROM 
        items AS i
    LEFT JOIN latest_prices AS lp ON lp.item_id = i.id
    LEFT JOIN item_interval_snapshots AS iis ON iis.item_id = lp.item_id
    WHERE
        i.id = @id
`)

function getItemProfileById(id) {
  return getItemProfileStatement.get({ id });
}

//home summary
const getMostExpensiveItemsStatement = db.prepare(`
    SELECT
        i.id,
        i.name,
        lp.high AS price_high,
        lp.low AS price_low, 
        lp.updated_at,
        i.members
    FROM
        latest_prices AS lp
    LEFT JOIN items AS i on i.id = lp.item_id
    WHERE
        lp.high IS NOT NULL
    ORDER BY
        lp.high DESC
    LIMIT 10
`)

function getMostExpensiveItems() {
    return getMostExpensiveItemsStatement.all();
}

const getTopSpreadsStatement = db.prepare(`
    SELECT
        i.id, 
        i.name,
        lp.high,
        lp.low,
        (lp.high - lp.low) AS spread,
        lp.updated_at
    FROM
        latest_prices AS lp
    JOIN items i ON i.id = lp.item_id
    WHERE
        lp.high IS NOT NULL
        AND
        lp.low IS NOT NULL
    ORDER BY
        spread DESC
    LIMIT 10
`);

function getTopSpreads() {
    return getTopSpreadsStatement.all();
}

const getTopAlchStatement = db.prepare(`
    WITH rune_cost AS (
        SELECT
            SUM(
                CASE
                    WHEN i.name = 'Nature rune' THEN lp.high
                    WHEN i.name = 'Fire rune' THEN 5 * lp.high
                END
            ) AS total_rune_cost
        FROM
            items as i
        JOIN latest_prices as lp ON lp.item_id = i.id
        WHERE
            i.name IN ('Nature rune', 'Fire rune')
    )
    SELECT
        i.id, 
        i.name, 
        i.highalch,
        lp.high,
        lp.low, 
        ((lp.high + lp.low) / 2.0) AS mid_price,
        rc.total_rune_cost AS rune_cost,
        i.highalch - (((lp.high + lp.low) / 2.0) + rc.total_rune_cost) AS alch_profit
    FROM
        items as i
    JOIN latest_prices as lp ON lp.item_id = i.id
    CROSS JOIN rune_cost as rc
    WHERE
        i.highalch IS NOT NULL
        AND
        lp.high IS NOT NULL
        AND
        lp.low IS NOT NULL
        AND
        (i.highalch - (((lp.high + lp.low) / 2.0) + rc.total_rune_cost)) > 0
    ORDER BY
        alch_profit DESC
    LIMIT 10
`)

function getTopAlch() {
    return getTopAlchStatement.all();
}

module.exports = {
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
};