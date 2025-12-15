OSRS Grand Exchange Market Tracker


A lightweight web app that displays market data for Old School RuneScape (OSRS) items traded on the Grand Exchange (in-game equivalent of NYSE). Users can browse items, review price/volume signals, and maintain a personal watchlist.


Live Demo: https://osrs.andrewsepuka.dev


Features:

Item search and detailed item profile view

Market metrics such as volume, bid/ask spread, recent trade signals

Price history chart using VWAP (Volume-Weighted Average Price)

Watchlist stored client-side (local caching)

Server-side persistence via SQLite to reduce repeated outbound API calls

Background refresh pipeline that ingests updated market data every 5 minutes


Tech Stack

Front-End: Vanilla JavaScript, HTML, CSS

Back-End: Node.js, Express

Database: SQLite

Data Source: OSRS Price Wiki API


Architecture Overview

This app is designed to minimize direct client traffic to external APIs and provide consistent, fast reads via:

-A scheduled job that pulls updated market data from the OSRS Price Wiki API every 5 minutes

-The server normalizes/stores results in SQLite (covering multiple API endpoints)

-The UI queries the server for item data and renders charts/metrics from persisted data

-The watchlist is cached locally in the browser for quick access


Why use VWAP for price history charts?

VWAP provides a more stable representation of price action than spot prices by weighting price by traded volume. For markets with fluctuating activity, VWAP better reflects “where trading actually happened” rather than noisy last-price snapshots.


Local Setup

1. Clone the repo

git clone https://github.com/asep96/OSRS-GrandExchange-App.git

cd OSRS-GrandExchange-App


2. Install dependencies

npm install

3. Configure environment variables

-Copy .env.example to .env and fill in values:

cp .env.example .env

5. Run the server

npm start

6. Open the app

Visit: http://localhost:3000/ in your web browser of choice


Deployment

This app is deployed on an Ubuntu VM with:

-nginx reverse proxy (public traffic on 80/443 → Node on 3000)

-HTTPS via Let’s Encrypt (Certbot)

-A cron job that triggers the internal refresh endpoint every 5 minutes

-Admin/refresh endpoints blocked from the public internet via nginx rules


Security Notes


-Do not commit secrets (scheduler secret, etc.)

-Use environment variables for anything sensitive

-Provide .env.example for local setup without exposing real values

-Admin/refresh endpoints are intended for internal use only (VM-local / blocked externally)
