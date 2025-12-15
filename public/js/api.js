async function searchItems(searchText) {
    try {
        //call backend to get data
        const res = await fetch(`/api/items/search?query=${encodeURIComponent(searchText)}`);

        //if there's an issue with the response, throw an error
        if (!res.ok) {
            const errText = await res.text();
            throw new Error(`Backend returned ${res.status}: ${errText}`);
        }

        const data = await res.json();
        //get array of results, if data.results is null resolve to empty array
        const results = data.results || [];

        return results;

    } catch (err) {
        console.error("Error in searchItems:", err);
        throw err;
    }
};


//fetch full profile for a single item:
//mapping (name, examine, alchs, members) + latest price snapshot.

async function getItemProfile(itemId) {
    try {
        const res = await fetch(`/api/items/profile?id=${encodeURIComponent(itemId)}`);

        if (!res.ok) {
            const errText = await res.text();
            throw new Error(`Backend returned ${res.status}: ${errText}`);
        }

        const item = await res.json();
        return item;
    } catch (err) {
        console.error("Error in getItemProfile:", err);
        throw err;
    }
}

async function getMostExpensiveItems() {
    try {
        const res = await fetch(`/api/home/top-expensive`);

        if(!res.ok) {
            const errText = await res.text();
            throw new Error(`Backend returned ${res.status}: ${errText}`);
        }

        const data = await res.json();

        return data.results || [];

    } catch (err) {
        console.error("Error in getHighestItems:", err);
        throw err;
    }
}

async function getTopItemSpreads() {
    try {
        const res = await fetch(`/api/home/top-spread`);

        if(!res.ok) {
            const errText = await res.text();
            throw new Error(`Backend returned ${res.status}: ${errText}`);
        }

        const data = await res.json();

        return data.results || [];
    } catch (err) {
        console.error("Error in getTopItemSpreads:", err);
        throw err;
    }
}

async function getTopAlchProfits() {
    try {
        const res = await fetch(`/api/home/top-alch`);

        if(!res.ok) {
            const errText = await res.text();
            throw new Error(`Backend returned ${res.status}: ${errText}`);
        }

        const data = await res.json();

        return data.results || [];
    } catch (err) {
        console.error("Error in getTopItemSpreads:", err);
        throw err;
    }
}

async function getItemHistory(itemId, timestep = "5m") {
    const params = new URLSearchParams({
        id: String(itemId),
        timestep,
    });

    const res = await fetch(`/api/items/history?${params.toString()}`);

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Backend returned ${res.status}: ${text}`);
    }

    const data = await res.json();
    return data;
}

//export functions
export { 
    searchItems,
    getItemProfile,
    getMostExpensiveItems,
    getTopItemSpreads,
    getTopAlchProfits,
    getItemHistory
};