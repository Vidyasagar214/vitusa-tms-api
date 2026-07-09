# Vitusa TMS — API

REST API for the Vitusa Transportation Management System. Built with Node.js, Express, and MongoDB.

**Companion repo:** [vitusa-tms-web](https://github.com/YOUR_ORG/vitusa-tms-web) (React frontend)

## Stack

- Node.js + Express 5
- MongoDB Atlas (Mongoose)
- JWT authentication
- OpenAPI / Swagger UI

## Prerequisites

- Node.js 18+
- MongoDB Atlas cluster (or local MongoDB)

## Setup

```bash
npm install
cp .env.example .env
# Edit .env with your MONGODB_URI and JWT_SECRET
```

## Run

```bash
# Development (nodemon)
npm run dev

# Production
npm start
```

Server runs on `http://localhost:5000` by default.

## Seed data (development)

```bash
npm run seed:users
npm run seed:shipments
npm run seed:master-data
npm run seed:invoices
```

Default admin (after `seed:users`): `admin@vitusa.com` / `password123`

## API documentation

- Swagger UI: [http://localhost:5000/api/docs](http://localhost:5000/api/docs)
- OpenAPI JSON: [http://localhost:5000/api/docs.json](http://localhost:5000/api/docs.json)

## Routes

| Prefix | Description |
|--------|-------------|
| `/api/auth` | Login, register, current user |
| `/api/shipments` | Shipment CRUD and lifecycle actions |
| `/api/dashboard` | Control tower KPIs |
| `/api/users` | User administration (admin) |
| `/api/master-data` | Customers, locations, carriers, commodities |
| `/api/invoices` | Freight audit queue |

## Architecture

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for system design, data models, and security.

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGODB_URI` | Yes | MongoDB connection string |
| `JWT_SECRET` | Yes | Secret for signing JWT tokens |
| `PORT` | No | HTTP port (default `5000`) |

## Frontend integration

The React app connects via `VITE_API_URL` (default `http://localhost:5000/api`). Configure CORS is enabled for local development.

## License

ISC
