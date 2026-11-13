# Torque Garage

An interactive 3D car configurator built with React, Three.js, and React
Three Fiber. The project includes a browser-based frontend and a Node.js
backend for user accounts and saved configurations.

## Technologies

- React 19 and React Router
- Vite
- Three.js, React Three Fiber, and Drei
- Tailwind CSS
- Node.js and Express
- PostgreSQL with Sequelize
- JWT for authentication
- bcryptjs for password hashing

## Requirements

- Node.js 18 or newer
- npm
- PostgreSQL for account and configuration storage

## Installation

```bash
npm install
```

Create a `.env` file for the backend:

```env
DB_URL=<PostgreSQL connection string>
JWT_SECRET=<random JWT signing secret>
NODE_ENV=development
```

`DB_URL` may be omitted locally; the application will then use the default
value defined in `server/db.js`. Use a unique random value for `JWT_SECRET`.

## Running locally

First, you need to start the PostgreSQL database. The best way to do so, is by using pgAdmin.

Next, start the frontend in development mode:

```bash
npm run dev
```

The frontend is available at the address shown by Vite, usually
`http://localhost:5173`. Vite proxies local `/api` requests to
`http://localhost:3001`.

In a separate terminal, start the backend:

```bash
npm run server
```

The backend runs on port `3001`, connects to PostgreSQL, and synchronizes the
Sequelize models on startup.

## Production build

```bash
npm run build
npm run preview
```

The `npm run build` command first compresses all `.glb` models into
`public/compressed/`, copies the Draco decoder, and then creates the `dist/`
directory.

### Render

The `render.yaml` blueprint deploys the frontend as a static site and the
Express API as a separate Node web service. Set `DB_URL` and `JWT_SECRET` on
the `ibm-projekt-backend` service. The frontend uses
`https://ibm-projekt-backend.onrender.com` for production API requests; set
`VITE_API_URL` if the backend has a different URL.

## Project structure

```text
src/
  App.jsx                 application routing
  components/
    Scene.jsx             configurator and garage interface
    CarModel.jsx          car model
    Garage.jsx            garage scene
    AuthPanel.jsx         registration, login, and session handling
    AdminDashboard.jsx    administration panel
server/
  server.js               Express routes and authentication
  db.js                   PostgreSQL connection and user model
public/
  *.glb                   car and component models
  compressed/             models generated with Draco compression
scripts/
  compress-models.mjs     3D asset preparation script
```

## npm scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Compresses models and starts Vite |
| `npm run server` | Starts the Express backend |
| `npm run compress-models` | Compresses GLB models with Draco |
| `npm run build` | Compresses models and builds the frontend |
| `npm run preview` | Starts a local preview of the production build |