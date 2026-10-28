# CampusBid

CampusBid is a campus-focused auction marketplace built with MongoDB, Express, React, and Node.js. Visitors can learn about the service on the public overview page. After registering as a buyer or seller, users get role-specific workspaces and auction actions.

## Features

### Public and account experience

- Public overview homepage with separate entry points for buyers and sellers.
- Registration and sign-in with buyer or seller roles.
- Role-protected workspaces and navigation. The account-name menu contains profile and sign-out actions.

### Buyer experience

- Browse the marketplace with search, pagination, and category, condition, price, and auction-status filters. Listings across statuses can be viewed; the default view is not limited to active auctions.
- View auction details, seller information, current bid, bid history, questions and answers, and auction timing.
- Place manual bids on active auctions and configure automatic-bid limits on scheduled or active auctions.
- See the buyer's own saved automatic-bid maximum on the auction detail page. That private limit is returned only to the authenticated buyer who set it.
- If an automatic-bid limit is saved for a scheduled auction, automatic bidding starts when the auction opens.
- A buyer who is currently leading cannot bid again until another buyer places a bid.
- Follow listings in a persistent watchlist, view notifications, and review bid and purchase history. Purchase history displays the approved purchase amount.
- Ask sellers questions while chat is available. New questions and replies are disabled when an auction is reserved or sold; existing Q&A remains visible.

### Seller experience

- Create listings with title, category, condition, description, starting price, bid increment, and auction start/end times.
- Upload up to six JPG, PNG, or WebP images per listing, with a 5 MB limit per image.
- Manage personal listings and review seller-scoped sales history.
- Approve or reject a provisional auction winner. Once approved, the item is reserved while the buyer and seller arrange a campus handover.
- Sold and reserved listings cannot be relisted from the seller controls.
- Review handover progress and confirm completion from the seller workspace.

### Auction and handover workflow

- Auction statuses include `scheduled`, `active`, `awaiting seller decision`, `reserved`, `sold`, `unsold`, `cancelled`, and `failed pickup`.
- A scheduled-auction worker activates auctions at their start time and finalizes expired auctions. The worker runs every 30 seconds.
- Bid acceptance uses a conditional database update so stale simultaneous bids are rejected rather than silently overwriting one another.
- If a valid bid arrives with 30 seconds or less remaining, the close time is extended to 60 seconds after that bid.
- Countdown displays show hours and minutes when at least an hour remains, and minutes and seconds when less than an hour remains.
- The seller's approval reserves the item for the provisional winner. The buyer and seller schedule and confirm the handover separately; the auction is marked sold only after both confirm.
- Auction updates and new bids are broadcast to connected clients through Socket.IO.

## Technology

- **Frontend:** React 18, Vite, React Router, Tailwind CSS, Axios, Socket.IO Client
- **Backend:** Node.js, Express, Mongoose, JWT, Socket.IO
- **Database:** MongoDB

The backend follows an MVC-style layout:

```text
server/
  config/        MongoDB and Socket.IO setup
  controllers/   Request handlers
  jobs/          Scheduled auction worker
  middleware/    Authentication, role checks, uploads, error handling
  models/        Mongoose schemas
  routes/        API route definitions
  services/      Auction and automatic-bid logic
client/
  src/
    components/  Shared UI components
    context/     Authentication state
    layouts/     Shared application layout
    pages/       Public, buyer, seller, and auction pages
    utils/       Formatting and image helpers
```

## Requirements

- Node.js and npm
- MongoDB Community Server running locally, or a MongoDB Atlas connection string
- MongoDB Compass is optional and can be used to browse the database; it is a GUI client and does not replace the MongoDB server

## Configure MongoDB and the server

The default database URI is:

```text
mongodb://127.0.0.1:27017/campusbid
```

For local development, start MongoDB Community Server and connect to `mongodb://127.0.0.1:27017` in Compass. The `campusbid` database and collections are created as the application writes data.

To configure a different database or JWT secret:

1. Copy `.env.example` to `server/.env`.
2. Set `MONGODB_URI` to your MongoDB connection string.
3. Set `JWT_SECRET` to a long, private random value.
4. Optionally set `PORT` (defaults to `5000`).

Do not commit `server/.env` or share its contents. The application requires a reachable MongoDB instance and reports a connection failure rather than falling back to temporary in-memory storage.

## Install and run

From the repository root:

```bash
npm install
npm --prefix client install
npm run dev
```

The development command starts the Express API and Vite frontend. The frontend is served by Vite, and its `/api`, uploads, and Socket.IO requests are proxied to the backend during development.

Useful commands:

```bash
npm run server       # Start the backend with nodemon
npm run client       # Start the Vite frontend
npm run build        # Create a production frontend build
npm start            # Start the backend without nodemon
```

## API

The current role-aware API is mounted at `/api/v1`. Authentication endpoints are:

```text
POST /api/v1/auth/register
POST /api/v1/auth/login
GET  /api/v1/auth/me
```

The API also exposes role-protected endpoints for marketplace and auction details, bids, automatic bids, watchlists, buyer purchases and activity, seller listings and sales history, notifications, questions and answers, and handovers.

Legacy route groups remain mounted at `/api/auth`, `/api/auctions`, and `/api/users` for compatibility. New client functionality should use `/api/v1`.

Health check:

```text
GET http://localhost:5000/api/health
```

## Data and privacy

Auction listings and bid activity are stored in MongoDB. Automatic-bid rules store the bidder, auction, maximum amount, and active state. A buyer's automatic-bid maximum is included only in that buyer's authenticated auction-detail response; it is not included in marketplace listing results or responses for sellers and other buyers.
