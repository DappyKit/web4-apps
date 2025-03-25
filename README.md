# DappyKit Apps

[![Backend Checks](https://github.com/DappyKit/web4-apps/actions/workflows/backend-checks.yml/badge.svg)](https://github.com/DappyKit/web4-apps/actions/workflows/backend-checks.yml)
[![UI Checks](https://github.com/DappyKit/web4-apps/actions/workflows/ui-checks.yml/badge.svg)](https://github.com/DappyKit/web4-apps/actions/workflows/ui-checks.yml)
[![codecov](https://codecov.io/gh/DappyKit/web4-apps/graph/badge.svg?token=your-codecov-token)](https://codecov.io/gh/DappyKit/web4-apps)

A Web3 application platform built with React, TypeScript, and Vite that allows users to create, manage, and share decentralized applications (dApps) and templates.

## 📱 Features

- **Create and manage Web3 applications**: Build, deploy, and share decentralized applications
- **Template library**: Access pre-built templates to jumpstart your dApp development
- **Dashboard interface**: Monitor and manage your applications
- **Responsive design**: Mobile-friendly UI that adapts to different screen sizes
- **Web3 integration**: Built-in wallet connection and blockchain interaction using DappyKit SDK

## 🔧 Tech Stack

### Frontend

- React 18 with TypeScript
- Vite for build tooling
- React Router for navigation
- Redux Toolkit for state management
- React Bootstrap for UI components
- React Query for data fetching
- DappyKit SDK for Web3 functionality
- Fully responsive design for mobile and desktop

### Backend

- Node.js with Express
- TypeScript
- Knex.js for database migrations and queries
- MySQL/PostgreSQL/SQLite support
- REST API

## 🚀 Getting Started

### Prerequisites

- Node.js (v20 or higher)
- npm or yarn
- MySQL or another supported database

### Installation

1. Clone the repository:

   ```sh
   git clone https://github.com/DappyKit/web4-apps.git
   cd web4-apps
   ```

2. Install frontend dependencies:

   ```sh
   npm install
   ```

3. Setup the backend:

   ```sh
   cd backend
   npm install
   ```

4. Configure the backend:

   - Copy `.env.example` to `.env` in the backend directory
   - Update the database configuration in `.env`

5. Configure the frontend:

   - Copy `.env.example` to `.env` in the project root
   - Update the API URL if needed in `.env`

6. Create the database:

   ```sh
   mysql -u root -p<YOUR_PASSWORD> -e "CREATE DATABASE IF NOT EXISTS dappykit_apps CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
   ```

7. Create a dedicated database user:

   ```sh
   mysql -u root -p<YOUR_PASSWORD> -e "CREATE USER 'dappykit_apps'@'localhost' IDENTIFIED BY '<DB_USER_PASSWORD>'; GRANT ALL PRIVILEGES ON dappykit_apps.* TO 'dappykit_apps'@'localhost'; FLUSH PRIVILEGES;"
   ```

8. Run database migrations:

   ```sh
   npm run migrate
   ```

9. Seed the database with initial data:
   ```sh
   npm run seed
   ```

## 💻 Development

### Running the application

1. Start the backend server:

   ```sh
   cd backend
   npm run dev
   ```

2. In a new terminal, start the frontend development server:

   ```sh
   # From the project root
   npm run dev
   ```

3. Access the application at http://localhost:5173

### Running Migrations

#### Development Environment
```sh
npm run migrate
```

#### Production Environment
```sh
# Make sure your .env file is properly configured with production database credentials
npm run migrate -- --env production
```

> **Note:** For production migrations, ensure your .env file is in the correct location (backend root directory) with proper database credentials (DB_HOST, DB_USER, DB_PASSWORD, DB_NAME).

### Starting with a fresh database

If you need to reset the database and start fresh:

```sh
npm run backend:new
```

This script will rollback migrations, run them again, seed the database, and start the backend server.

### Testing

Run frontend tests:

```sh
npm run ui:test
```

Run backend tests:

```sh
npm run backend:test
```

### Linting and Formatting

Check code formatting:

```sh
npm run format:check
```

Fix formatting issues:

```sh
npm run format
```

Check for lint errors:

```sh
npm run lint:check
```

Check TypeScript types:

```sh
npm run types:check
```

## 📁 Project Structure

```
web4-apps/
├── src/                   # Frontend source code
│   ├── assets/            # Static assets
│   ├── components/        # Reusable React components
│   ├── css/               # CSS styles
│   ├── Header/            # Header components
│   ├── pages/             # Page components
│   ├── redux/             # Redux store and slices
│   ├── services/          # API services
│   ├── utils/             # Utility functions
│   ├── App.tsx            # Main App component
│   ├── main.tsx           # Entry point
│   └── ...
├── backend/               # Backend source code
│   ├── migrations/        # Database migrations
│   ├── src/               # Backend source files
│   │   ├── routes/        # API routes
│   │   ├── seeds/         # Database seed files
│   │   ├── tests/         # Backend tests
│   │   ├── utils/         # Backend utilities
│   │   ├── index.ts       # Backend entry point
│   │   └── ...
│   └── ...
├── public/                # Static public assets
└── ...
```

## 📝 Development Guidelines

- Follow TypeScript best practices
- Write JSDoc comments for all functions
- Ensure responsive design works on mobile devices
- Run tests, linters, and formatters before committing

## 🔗 Useful Commands

- `npm run dev`: Start the frontend development server
- `npm run backend:dev`: Start the backend development server
- `npm run build`: Build the frontend for production
- `npm run backend:build`: Build the backend for production
- `npm run ui:test`: Run frontend tests
- `npm run backend:test`: Run backend tests

## 🔧 Environment Variables

### Frontend (.env in project root)
- `VITE_API_URL`: URL for the backend API server (default: http://localhost:3001)

### Backend (.env in backend directory)
- `DB_HOST`: Database host
- `DB_USER`: Database username
- `DB_PASSWORD`: Database password
- `DB_NAME`: Database name
- `PORT`: Backend server port (default: 3001)

## 📄 License

[MIT License](LICENSE)