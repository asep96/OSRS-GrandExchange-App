let itemChart = null;

function formatGp(value) {
    if (value == null) return "N/A";
    // If it's a number, format with commas, then add " gp"
    if (typeof value === "number") {
        return value.toLocaleString("en-US") + " gp";
    }
    //just show the raw value as fallback
    return `${value} gp`;
}

function formatVol(value){
  if (value == null) return "N/A";
  if (typeof value === "number") {
    return value.toLocaleString("en-US");
  }
  return `${value}`;
}


//Show a loading message for a specific item.
function showItemLoading(itemId, itemDetailsEl) {
    itemDetailsEl.innerHTML = `
        <div class="item-details-card">
            <p>Loading details for item ${itemId}...</p>
        </div>
    `;
}

/**
 * Render the item details area with the data from the backend.
 * `item` is whatever the /api/items/latest endpoint returns.
 */
function showItemDetails(item, itemDetailsEl) {
    const title = item.name ?? `Item ${item.name}`;
    const membersLabel = item.members ? "Members Item" : "Free-to-Play Item";
    const examine = item.examine || "No examine text avaialble";
    const updatedRaw = item.updatedAt || "Unknown";
    
    //declare with initial value of unknown since value will stay same if updatedRaw is "unknown"
    let updatedLabelLocale = "Unknown";

    if(updatedRaw !== "Unknown") {
      //convert time so data in updatedRaw is in "YYYY-MM-DDTHH:mm:ssZ" format
      //allows displayed to be in user's timezone
      const isoUtc = updatedRaw.replace(" ", "T") + "Z";
      const d = new Date(isoUtc);
      updatedLabelLocale = d.toLocaleString("en-US");
    }

    //declare initial time and rawTime values
    let highTime = "Unknown"
    const highTimeRaw = item.high_time || "Unknown";

    let lowTime = "Unknown";
    const lowTimeRaw = item.low_time || "Unknown"

    //function to convert raw times to locale strings
    function convertRawToLocale(timeRaw) {
      return new Date(timeRaw * 1000).toLocaleString();
    }

    //convert raw times to local time
    if (highTimeRaw !== "Unknown") {
      highTime = convertRawToLocale(highTimeRaw);
    }

    if (lowTimeRaw !== "Unknown") {
      lowTime = convertRawToLocale(lowTimeRaw);
    }


    //calculate bid-ask spread
    const bidAskSpread = item.high - item.low;

    //calculate daily volume
    const dailyVolume = item.avgHighPriceVolume24h + item.avgLowPriceVolume24h;

    //icon URL for generating item icons
    const iconUrl = `https://static.runelite.net/cache/item/icon/${item.id}.png`;

    itemDetailsEl.innerHTML = `
    <div class="item-details-card">
      <div class="item-header-main">
        <div class="item-header-left">
          <img
            class="item-icon"
            src="${iconUrl}"
            alt="${title} icon"
            loading="lazy"
          />
          <div class="item-title-block">
            <h2 class="item-name">${title}</h2>
            <div class="item-about">
              <p>${examine}</p>
            </div>
            <div class="item-meta">
              <span class="item-id">Item ID: ${item.id}</span>
              <span class="item-members-badge ${item.members ? "members" : "f2p"}">
                ${membersLabel}
              </span>
            </div>
          </div>
        </div>
        <div class="item-updated">
          <span class="label">Last updated</span>
          <span class="value">${updatedLabelLocale}</span>
        </div>
      </div>

      <div class="item-price-section">
        <div class="item-main-price">
          <span class="price-label">High price</span>
          <span class="price-value">${formatGp(item.high)}</span>
        </div>
        <div class="item-secondary-prices">
          <div class="price-pill">
            <span class="pill-label">Buy Limit: </span>
            <span class="pill-value">${item.limit}</span>
          </div>
          <div class="price-pill">
            <span class="pill-label">Daily Volume: </span>
            <span class="pill-value">${formatVol(dailyVolume)}</span>
          </div>
          <div class="price-pill">
            <span class="pill-label">Bid:</span>
            <span class="pill-value">${formatGp(item.low)}</span>
          </div>
          <div class="price-pill">
            <span class="pill-label">Ask:</span>
            <span class="pill-value">${formatGp(item.high)}</span>
          </div>
          <div class="price-pill">
            <span class="pill-label">Bid-Ask Spread: </span>
            <span class="pill-value">${formatGp(bidAskSpread)}</span>
          </div>
        </div>
      </div>

      <div class="item-stats-grid">
        <div class="stat-card">
          <span class="stat-label">High Alch</span>
          <span class="stat-value">${formatGp(item.highalch)}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Low Alch</span>
          <span class="stat-value">${formatGp(item.lowalch)}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">High Price (Instant Buy)</span>
          <span class="stat-value">${formatGp(item.high)}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Low price (Instant Sell)</span>
          <span class="stat-value">${formatGp(item.low)}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Last Bid Order</span>
          <span class="stat-value">Price: ${formatGp(item.low)}</span>
          <span class="stat-value">Order Time: ${lowTime}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Last Ask Order</span>
          <span class="stat-value">Price: ${formatGp(item.high)}</span>
          <span class="stat-value">Order Time: ${highTime}</span>
        </div>
      </div>

      <div class="item-stats-grid">
        <h3>5 Minute Activity</h3>
        <div class="stat-card">
          <span class="stat-label">Average High Price</span>
          <span class="stat-value">${formatGp(item.avgHighPrice5m)}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">High Price Volume</span>
          <span class="stat-value">${formatVol(item.avgHighPriceVolume5m)}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Average Low Price</span>
          <span class="stat-value">${formatGp(item.avgLowPrice5m)}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Low Price Volume</span>
          <span class="stat-value">${formatVol(item.avgLowPriceVolume5m)}</span>
        </div>
      </div>

      <div class="item-stats-grid">
        <h3>1 Hour Activity</h3>
        <div class="stat-card">
          <span class="stat-label">Average High Price</span>
          <span class="stat-value">${formatGp(item.avgHighPrice1h)}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">High Price Volume</span>
          <span class="stat-value">${formatVol(item.avgHighPriceVolume1h)}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Average Low Price</span>
          <span class="stat-value">${formatGp(item.avgLowPrice1h)}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Low Price Volume</span>
          <span class="stat-value">${formatVol(item.avgLowPriceVolume1h)}</span>
        </div>
      </div>

      <div class="item-stats-grid">
        <h3>24 Hour Activity</h3>
        <div class="stat-card">
          <span class="stat-label">Average High Price</span>
          <span class="stat-value">${formatGp(item.avgHighPrice24h)}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">High Price Volume</span>
          <span class="stat-value">${formatVol(item.avgHighPriceVolume24h)}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Average Low Price</span>
          <span class="stat-value">${formatGp(item.avgLowPrice24h)}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Low Price Volume</span>
          <span class="stat-value">${formatVol(item.avgLowPriceVolume24h)}</span>
        </div>
      </div>

      <div class="warning-message">
      </div>

      <div class="item-chart-section">
        <div class="section-header">
          <h3>Price history</h3>
          <div class="chart-intervals">
            <button type="button" data-interval="5m">5m</button>
            <button type="button" data-interval="1h">1h</button>
            <button type="button" data-interval="6h">6h</button>
            <button type="button" data-interval="24h">24h</button>
          </div>
        </div>
        <div id="item-chart-container" class="item-chart-placeholder">
          Chart will go here once history data is wired up.
        </div>
      </div>
    </div>
  `;

  if(dailyVolume < 25000) {
    renderWarningMessage(itemDetailsEl);
  }
}

function initChartControls(itemDetailsEl, activeInterval, onIntervalChange) {
  const container = itemDetailsEl.querySelector(".chart-intervals");
  if (!container) return;

  const buttons = Array.from(
    container.querySelectorAll("button[data-interval")
  );

  buttons.forEach((btn) => {
    const interval = btn.getAttribute("data-interval");
    if (!interval) return;

    //initial active state
    btn.classList.toggle("active-interval", interval === activeInterval);

    btn.addEventListener("click", () => {
      //update active class on all buttons
      buttons.forEach((b) => {
        const bInterval = b.getAttribute("data-interval");
        b.classList.toggle("active-interval", bInterval === interval);
      });

      onIntervalChange(interval);
    });
  });
}

//helper function to find the chart container from anywhere in this module
function getChartContainer() {
  return document.querySelector("#item-details #item-chart-container");
}

function showChartLoading(interval) {
  const container = getChartContainer();
  if (!container) return;

  if (itemChart) {
    itemChart.destroy();
    itemChart = null;
  }

  container.classList.add("item-chart-placeholder");
  container.innerHTML = `Loading ${interval} history...`;
}

function showChartError(message) {
  const container = getChartContainer();
  if (!container) return;

  if (itemChart) {
    itemChart.destroy();
    itemChart = null;
  }

  container.classList.add("item-chart-placeholder");
  container.innerHTML = `Error loading history: ${message}`;
}


//Render a real line chart with Chart.js.
//chartPoints: [{ x: ts(ms), y: vwap }, ...]
function renderItemChart(interval, chartPoints) {
  const container = getChartContainer();
  if (!container) return;

  //no data case
  if (!Array.isArray(chartPoints) || chartPoints.length === 0) {
    if (itemChart) {
      itemChart.destroy();
      itemChart = null;
    }
    container.classList.add("item-chart-placeholder");
    container.innerHTML = `No data available for ${interval} interval.`;
    return;
  }

  //clear placeholder styling
  container.classList.remove("item-chart-placeholder");
  container.innerHTML = `<canvas id="item-chart-canvas"</canvas>`;

  const canvas = container.querySelector("#item-chart-canvas");
  if(!canvas) return;

  const ctx = canvas.getContext("2d");

  //build labels and data from chartpoints
  const labels = chartPoints.map((p) => {
    const d = new Date(p.x);
    if (interval === "24h" || interval === "6h") {
      return d.toLocaleDateString("en-US", {month: "short", day: "numeric"});
    }
    return d.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  });

  const data = chartPoints.map((p) => p.y);

  //kill old chart if it exists
  if (itemChart) {
    itemChart.destroy();
  }

  //create new line chart
  itemChart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: `VWAP (${interval})`,
          data,
          borderWidth: 2,
          tension: 0.25,
          pointRadius: 0,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          callbacks: {
            label(context) {
              const value = context.parsed.y; 
              return `${value.toLocaleString("en-US")} gp`;
            },
          },
        },
      },
      scales: {
        x: {
          ticks: {
            maxTicksLimit: 8,
          },
        },
        y: {
          ticks: {
            callback(value) {
              return value.toLocaleString("en-US");
            },
          },
        },
      },
    },
  });
}

//display warning message
function renderWarningMessage(itemDetailsEl){
  const warningMessageContainer = itemDetailsEl.querySelector(".warning-message");
  if(!warningMessageContainer) return;

  warningMessageContainer.innerHTML = "WARNING: This item has low trading volume. Price history chart data may be inaccurate due to limitations of the OSRS Price API.";
}

//Show an error message if loading the item fails.
function showItemError(message, itemDetailsEl) {
  itemDetailsEl.innerHTML = `
      <div class="item-details-card">
          <p style="color:#ff6b6b;">Error loading details: ${message}</p>
      </div>
  `;
}

export {
  showItemLoading,
  showItemDetails,
  showItemError,
  initChartControls,
  showChartLoading,
  showChartError,
  renderItemChart,
  renderWarningMessage,
};
