//import functions
import { 
    searchItems,
    //getItemLatest,
    getItemProfile,
    getMostExpensiveItems,
    getTopItemSpreads,
    getTopAlchProfits,
    getItemHistory
} from "./api.js";

import {
    showSearchLoading, 
    showSearchResults,
    showSearchEmpty,
    showSearchError,
    renderWatchlist,
    renderTopExpensiveItems,
    renderTopItemSpreads,
    renderTopAlchProfits
} from "./homeView.js";

import {
    showItemLoading,
    showItemDetails,
    showItemError,
    initChartControls,
    showChartLoading,
    showChartError,
    renderItemChart,
} from "./itemView.js";

// Grab DOM elements
const searchForm = document.getElementById("search-form");
const searchInput = document.getElementById("search-input");
const searchResultsEl = document.getElementById("search-results");
const itemDetailsEl = document.getElementById("item-details");
const addWatchlistBtn = document.getElementById("add-watchlist-btn");
const watchlistListEl = document.getElementById("watchlist-list");

const homeViewEl = document.getElementById("home-view");
const itemViewEl = document.getElementById("item-view");
const backToHomeBtn = document.getElementById("back-to-home-btn");

const topExpensiveListEl = document.getElementById("top-expensive-list");
const topItemSpreadListEl = document.getElementById("top-item-spread-list");
const topAlchProfitListEl = document.getElementById("top-alch-profit-list");

const WATCHLIST_STORAGE_KEY = "osrsWatchlistV1";
let watchlist = [];

let currentItemId = null;
let currentInterval = "5m";
const historyCache = new Map();

// Load watchlist from localStorage on startup
function loadWatchlistFromStorage() {
    try {
        const raw = localStorage.getItem(WATCHLIST_STORAGE_KEY);

        if (!raw) return [];
        
        const parsed = JSON.parse(raw);
        
        if (!Array.isArray(parsed)) return [];
        
        // basic sanity filter
        return parsed.filter(
            (item) =>
                item &&
                typeof item.id === "number" &&
                typeof item.name === "string"
        );

    } catch (err) {
        console.error("Failed to load watchlist from storage:", err);
    return [];
    }
}

function saveWatchlistToStorage() {
    try {
        localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(watchlist));
    } catch (err) {
        console.error("Failed to save watchlist to storage:", err);
    }
}

function isInWatchlist(itemId) {
    const numericId = Number(itemId);
    return watchlist.some((item) => item.id === numericId);
}

function addToWatchlist(item) {
    if (!item || item.id == null) return;
    if (isInWatchlist(item.id)) return;

    const name = item.name ?? `Item ${item.id}`;

    const highPrice = item.high ??
        item.high ??
        item.price_high ??
        item.mid ??
        item.vwap ??
        null;

    watchlist.push({ 
        id: Number(item.id), 
        name, 
        high: highPrice,
    });

    saveWatchlistToStorage();
    renderWatchlist(watchlistListEl, watchlist, loadItemDetails);
}

function removeFromWatchlist(itemId) {
    const numericId = Number(itemId);
    watchlist = watchlist.filter((item) => item.id !== numericId);

    saveWatchlistToStorage();
    renderWatchlist(watchlistListEl, watchlist, loadItemDetails);
}

function setupWatchlistButtonForItem(item) {
    if (!addWatchlistBtn) return;

    addWatchlistBtn.disabled = false;

    if (isInWatchlist(item.id)) {
        addWatchlistBtn.textContent = "Remove from watchlist";
        addWatchlistBtn.onclick = () => {
            removeFromWatchlist(item.id);
            setupWatchlistButtonForItem(item);
        };
    } else {
        addWatchlistBtn.textContent = "Add to watchlist";
        addWatchlistBtn.onclick = () => {
            addToWatchlist(item);
            setupWatchlistButtonForItem(item);
        };
    }
}

// reveals homeView.js elements
function showHomeView() {
  homeViewEl.classList.remove("hidden");
  itemViewEl.classList.add("hidden");
  
  searchInput.value = "";

  const listOfSearchResults = document.getElementById("list-of-clickable-items");
  listOfSearchResults.remove();
}

//reveals itemView.js elements
function showItemView() {
  homeViewEl.classList.add("hidden");
  itemViewEl.classList.remove("hidden");
}

// button that takes us back from item view to home view
backToHomeBtn.addEventListener("click", () => {
  showHomeView();
});

// Handle search submit
searchForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const query = searchInput.value.trim();
    if (!query) return;

    //show results and pass through they query and our search results element
    showSearchLoading(query, searchResultsEl);

    try {
        //get array that is returned 
        const results = await searchItems(query, searchResultsEl);

        //if no results, show empty message
        if (results.length === 0) {
            showSearchEmpty(query, searchResultsEl)
            return;
        }

        //if results were found, show the results
        showSearchResults(results, searchResultsEl, loadItemDetails);
        
    } catch (err) {
        console.error("Error in search:", err);
        showSearchError(err.message, searchResultsEl);
    }
    
});

//get individual item details
async function loadItemDetails(itemId) {
    currentItemId = itemId;
    currentInterval = "24h"; // default interval for the chart

    // Switch view: hide home, show item
    homeViewEl.classList.add("hidden");
    itemViewEl.classList.remove("hidden");

    // Show loading UI for item details
    showItemLoading(itemId, itemDetailsEl);

    try {
        const res = await fetch(
            `/api/items/profile?id=${encodeURIComponent(itemId)}`
        );

        if (!res.ok) {
            const text = await res.text();
            throw new Error(`Backend returned ${res.status}: ${text}`);
        }

        const item = await res.json();

        showItemDetails(item, itemDetailsEl);

        // Wire up chart interval buttons in the freshly rendered card
        initChartControls(itemDetailsEl, currentInterval, async (newInterval) => {
            currentInterval = newInterval;
            await loadHistoryForInterval(currentItemId, currentInterval);
        });

        setupWatchlistButtonForItem(item);

        // Load the default interval's history
        await loadHistoryForInterval(currentItemId, currentInterval);
    } catch (err) {
        console.error("Error in loadItemDetails:", err);
        showItemError(err.message, itemDetailsEl);
    }
}

async function loadHistoryForInterval(itemId, interval) {
    const key = `${itemId}:${interval}`;

    //use interval if in cache
    if (historyCache.has(key)) {
        const cachedPoints = historyCache.get(key);
        renderItemChart(interval, cachedPoints);
        return;
    }

    //if not in cache, show loading state
    showChartLoading(interval);

    try {
        //get data from backend
        const data = await getItemHistory(itemId, interval);
        const rawPoints = Array.isArray(data.points) ? data.points : [];

        //convert to chart-friendly {x, y} coordinates
        const chartPoints = rawPoints
            .filter((p) => p && p.ts != null && p.vwap != null)
            .map((p) => ({
            x: p.ts,        // ms
            y: p.vwap,      // gp
            }));

        //Store chart in cache
        historyCache.set(key, chartPoints);

        //render chart
        renderItemChart(interval, chartPoints);
    } catch (err) {
        console.error("Failed to load history:", err);
        showChartError(err.message);
    }
}

//helper function to load all 3 cards
async function initHomeSumary() {
    if (!topExpensiveListEl) return;

    try {
        topExpensiveListEl.textContent = "Loading...";
        const items = await getMostExpensiveItems();
        renderTopExpensiveItems(topExpensiveListEl, items, loadItemDetails);
    } catch (err) {
        console.error("Failed to load most expensive items:", err);
        topExpensiveListEl.textContent = "Failed to load most expensive items."
    }

    if (!topItemSpreadListEl) return;

    try {
        topItemSpreadListEl.textContent = "Loading...";
        const items = await getTopItemSpreads();
        renderTopItemSpreads(topItemSpreadListEl, items, loadItemDetails);
    } catch (err) {
        console.error("Failed to load highest item bid-ask spreads:". err);
        topItemSpreadListEl.textContent = "Failed to load highest item bid-ask spreads";
    }

    if (!topAlchProfitListEl) return;

    try {
        topAlchProfitListEl.textContent = "Loading...";
        const items = await getTopAlchProfits();
        renderTopAlchProfits(topAlchProfitListEl, items, loadItemDetails);
    } catch (err) {
        console.error("Failed to load top alch profits:", err);
        topAlchProfitListEl.textContent = "Failed to load top alch profits."
    }
}

// Initial watchlist load + render
watchlist = loadWatchlistFromStorage();
renderWatchlist(watchlistListEl, watchlist, loadItemDetails);
initHomeSumary();