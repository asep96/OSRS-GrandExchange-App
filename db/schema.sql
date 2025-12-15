CREATE TABLE IF NOT EXISTS latest_prices (
    item_id     INTEGER PRIMARY KEY,
    high        INTEGER, 
    low         INTEGER,
    high_time   INTEGER,
    low_time    INTEGER,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS items (
    id         INTEGER PRIMARY KEY, 
    name       TEXT NOT NULL, 
    members    INTEGER,
    examine    TEXT,
    highalch   INTEGER,
    lowalch    INTEGER,
    itemLimit  INTEGER,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS item_interval_snapshots (
    item_id                INTEGER PRIMARY KEY, 
    avgHighPrice5m         INTEGER,
    avgHighPriceVolume5m   INTEGER,
    avgLowPrice5m          INTEGER,
    avgLowPriceVolume5m    INTEGER,
    avgHighPrice1h         INTEGER,
    avgHighPriceVolume1h   INTEGER,
    avgLowPrice1h          INTEGER,
    avgLowPriceVolume1h    INTEGER,
    avgHighPrice24h        INTEGER,
    avgHighPriceVolume24h  INTEGER,
    avgLowPrice24h         INTEGER,
    avgLowPriceVolume24h   INTEGER,
    updated_at             DATETIME DEFAULT CURRENT_TIMESTAMP
);
