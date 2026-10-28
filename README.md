# CampusBid

A campus auction platform built with the MERN stack and MVC structure.

## MongoDB and environment

Install and start MongoDB Community Server locally, then connect to the same database from MongoDB Compass using:

`mongodb://127.0.0.1:27017/campusbid`

Compass is the GUI client; the MongoDB server must be running separately. The backend uses the URI above by default. To use a different local or Atlas URI, create a `.env` file from `.env.example` and set `MONGODB_URI`.

The server exits with a connection error if MongoDB is not available; it no longer silently switches to temporary in-memory storage.

## Start the application

1. Start MongoDB Community Server.
2. Open MongoDB Compass and connect to `mongodb://127.0.0.1:27017`.
3. In the project root, run `npm install` and `npm --prefix client install`.
4. Run `npm run dev`.

The `campusbid` database and its collections are created automatically when the app first writes data.

For other databases, copy `.env.example` to `.env`, set `MONGODB_URI` and provide a private `JWT_SECRET`.

## Buyer and seller flows

- Buyers can browse and search auctions, combine category/condition/price/status filters, place manual and automatic bids, manage a persistent watchlist, view bid activity, notifications, and purchases.
- Sellers can create listings with separate start and close times, upload up to six JPG/PNG/WebP images (5 MB each), manage their own listings, approve/reject provisional winners, and review seller-scoped sales history.
- Auction transitions and accepted bids are stored in MongoDB. Bids use a conditional atomic update to reject stale simultaneous bids; late bids in the final two minutes extend the closing time by two minutes.
- A scheduled worker activates upcoming auctions, closes expired auctions, and creates seller/buyer notifications. Completed sale revenue is recorded only after both buyer and seller confirm the campus handover.
- All buyer/seller API endpoints are role-protected under `/api/v1`; the prior `/api` routes remain for compatibility.

The local API health endpoint is `http://localhost:5000/api/health`.

## Features

- Role-based buyer and seller dashboards and navigation
- Searchable, filterable, paginated buyer marketplace
- Seller listing, auction management, and personal sales history
- Bid history, automatic bidding, Socket.IO auction updates, and late-bid extensions
- Persistent watchlists, saved searches, and role-specific notifications
- Seller-approved reservations with dual-confirmation campus handovers
- Responsive React frontend with Tailwind CSS
