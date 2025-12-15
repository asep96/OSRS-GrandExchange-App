function showSearchLoading(query, searchResultsEl) {
    // Show loading state text
    searchResultsEl.innerHTML = `<p>Searching for: <strong>${query}</strong>...</p>`;
}

function showSearchResults(results, searchResultsEl, onItemSelected) {
    // Render a list of clickable results
    const listOfClickableItems = document.createElement("ul");
    listOfClickableItems.id = "list-of-clickable-items";

    //iterate through each result and create an element for them
    results.forEach((item) => {
        const li = document.createElement("li");
        
        //add button to list item with the specific item name and ID
        li.innerHTML = `
            <button data-item-id="${item.id}">
            <img
                src="https://static.runelite.net/cache/item/icon/${item.id}.png"
            />
            ${item.name}</button>
        `;
        
        //add child to list
        listOfClickableItems.appendChild(li);
    });

    //add list of clickable items to our search results element
    searchResultsEl.innerHTML = "";
    searchResultsEl.appendChild(listOfClickableItems);

    //attach click handlers to each button to load price details
    listOfClickableItems.querySelectorAll("button").forEach((btn) => {
        btn.addEventListener("click", () => {
            const id = btn.getAttribute("data-item-id");
            //call loadItemDetails and pass through the ID created when clicked
            onItemSelected(id);
        });
    });
}

function showSearchEmpty(query, searchResultsEl) {
    searchResultsEl.innerHTML = `<p>No items found for "${query}".</p>`;
}

function showSearchError(message, searchResultsEl) {
    searchResultsEl.innerHTML = `<p style="color:red;">Error: ${message}</p>`;
}

//helper to re-render the watchlist
function renderWatchlist(watchlistListEl, watchlist, onItemSelected) {
    watchlistListEl.innerHTML = "";

    if (watchlist.length === 0) {
        watchlistListEl.innerHTML = "<li>No items in watchlist yet.</li>";
        return;
    }

    for (const item of watchlist) {
        const li = document.createElement("li");
        const btn = document.createElement("button");
        btn.type = "button";

        btn.innerHTML = `
            <img
                src="https://static.runelite.net/cache/item/icon/${item.id}.png"
            />
            <span class="item-row-text">
                <span class="item-row-name">${item.name}</span>
                <span class="item-row-price">Price: ${item.high?.toLocaleString?.("en-us") ?? item.price_high} gp</span>
            </span>
        `;

        btn.addEventListener("click", () => {
            onItemSelected(item.id);
        });
        
        li.appendChild(btn);
        watchlistListEl.appendChild(li);
    }
}

function renderTopExpensiveItems(containerEl, items, onItemSelected) {
    containerEl.innerHTML = "";

    if (!items || items.length === 0) {
        containerEl.textContent = "No data available.";
        return;
    }

    const list = document.createElement("ul");

    items.forEach((item) => {
        const li = document.createElement("li");
        const btn = document.createElement("button");
        btn.type = "button";
        
        btn.innerHTML = `
            <img
                src="https://static.runelite.net/cache/item/icon/${item.id}.png"
            />
            <span class="item-row-text">
                <span class="item-row-name">${item.name}</span>
                <span class="item-row-price">Price: ${item.price_high?.toLocaleString?.("en-us") ?? item.price_high} gp</span>
            </span>
        `;

        btn.addEventListener("click", () => {
            onItemSelected(item.id);
        });

        li.appendChild(btn);
        list.appendChild(li);
    });

    containerEl.appendChild(list);
}

function renderTopItemSpreads(containerEl, items, onItemSelected) {
    containerEl.innerHTML = "";

    if (!items || items.length === 0) {
        containerEl.textContent = "No data available.";
        return;
    }

    const list = document.createElement("ul");

    items.forEach((item) => {
        const li = document.createElement("li");
        const btn = document.createElement("button");
        btn.type = "button";
        
        btn.innerHTML = `
            <img
                src="https://static.runelite.net/cache/item/icon/${item.id}.png"
            />
            <span class="item-row-text">
                <span class="item-row-name">${item.name}</span>
                <span class="item-row-price">Spread: ${item.spread?.toLocaleString?.("en-us") ?? item.spread} gp</span>
            </span>
        `;

        btn.addEventListener("click", () => {
            onItemSelected(item.id);
        });

        li.appendChild(btn);
        list.appendChild(li);
    });

    containerEl.appendChild(list);
}

function renderTopAlchProfits(containerEl, items, onItemSelected) {
    containerEl.innerHTML = "";

    if (!items) {
        containerEl.textContent = "Items array doesn't exist.";
        return; 
    }

    if (items.length === 0) {
        containerEl.textContent = "Items array exists, but there is no data";
        return;
    }

    const list = document.createElement("ul");

    items.forEach((item) => {
        const li = document.createElement("li");
        const btn = document.createElement("button");
        btn.type = "button";

        btn.innerHTML = `
            <img
                src="https://static.runelite.net/cache/item/icon/${item.id}.png"
            />
            <span class="item-row-text">
                <span class="item-row-name">${item.name}</span>
                <span class="item-row-price">Alch Profit: ${item.alch_profit?.toLocaleString?.("en-us") ?? item.alch_profit} gp</span>
            </span>
        `;

        btn.addEventListener("click", () => {
            onItemSelected(item.id);
        });

        li.appendChild(btn);
        list.appendChild(li);
    });

    containerEl.appendChild(list);
}

export { 
    showSearchLoading, 
    showSearchResults, 
    showSearchEmpty, 
    showSearchError,
    renderWatchlist,
    renderTopExpensiveItems,
    renderTopItemSpreads,
    renderTopAlchProfits
};