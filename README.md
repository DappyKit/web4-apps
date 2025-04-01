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

For a quick recreation of just the development database:

```sh
mysql -u root -p -e "DROP DATABASE IF EXISTS dappykit_apps; CREATE DATABASE dappykit_apps CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

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

## 🚀 Production Deployment

### Complete Deployment Process

Here's a step-by-step guide to deploy both frontend and backend in production:

1. Clone the repository on your server:
   ```sh
   git clone https://github.com/DappyKit/web4-apps.git
   cd web4-apps
   ```

2. Set up frontend environment:
   ```sh
   cp .env.example .env
   nano .env  # Adjust API URL to your production server
   ```

3. Build frontend:
   ```sh
   npm install
   npm run build
   ```

4. Set up backend:
   ```sh
   cd backend
   npm install
   cp .env.example .env
   nano .env  # Configure database and other settings for production
   ```

5. Create the database and user:
   ```sh
   mysql -u root -p<YOUR_PASSWORD> -e "CREATE DATABASE IF NOT EXISTS dappykit_apps CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
   mysql -u root -p<YOUR_PASSWORD> -e "CREATE USER 'dappykit_apps'@'localhost' IDENTIFIED BY '<DB_USER_PASSWORD>'; GRANT ALL PRIVILEGES ON dappykit_apps.* TO 'dappykit_apps'@'localhost'; FLUSH PRIVILEGES;"
   ```

6. Run migrations and build backend:
   ```sh
   npm run migrate -- --env production
   npm run build
   ```

7. Deploy with PM2:

   ```sh
   npm install -g pm2
   npm install -g typescript ts-node
   pm2 start src/index.ts --name web4 --interpreter ts-node
   pm2 save
   pm2 startup  # Follow instructions to enable startup on boot
   ```

   Note: Alternatively, you can deploy compiled JavaScript version if preferred:
   ```sh
   npm install -g pm2
   npm run build
   pm2 start dist/index.js --name dappykit-backend
   pm2 save
   pm2 startup
   ```

8. Configure web server (Nginx) to serve static files and proxy API requests:
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       
       # Serve frontend static files
       location / {
           root /path/to/web4-apps/dist;
           try_files $uri $uri/ /index.html;
       }
       
       # Proxy API requests to backend
       location /api {
           proxy_pass http://localhost:3001;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

9. Restart Nginx:
   ```sh
   sudo service nginx restart
   ```

### Running Backend with PM2

[PM2](https://pm2.keymetrics.io/) is a process manager for Node.js applications that helps keep your application running in production.

#### Installing PM2

```sh
npm install -g pm2
```

#### Building the Backend for Production

This step is optional if you're running TypeScript directly with ts-node:

```sh
cd backend
npm run build
```

#### Setting Up Environment Variables

Make sure you have your production environment variables set up in `.env` in the backend directory:

```sh
# Copy example environment file
cp .env.example .env

# Edit with your production settings
nano .env
```

#### Starting the Backend

Start TypeScript directly with PM2:

```sh
cd backend
pm2 start src/index.ts --name dappykit-backend --interpreter ts-node
```

You can also start with specific environment variables:

```sh
pm2 start src/index.ts --name dappykit-backend --interpreter ts-node --env production
```

Alternatively, if you prefer using compiled JavaScript:

```sh
cd backend
npm run build
pm2 start dist/index.js --name dappykit-backend
```

#### Managing the Backend Process

```sh
# Check status
pm2 status

# View logs
pm2 logs dappykit-backend

# Restart the backend
pm2 restart dappykit-backend

# Stop the backend
pm2 stop dappykit-backend

# Remove from PM2
pm2 delete dappykit-backend
```

#### Auto-restart on Server Reboot

Save the PM2 process list and configure it to start on boot:

```sh
pm2 save
pm2 startup
```

Then follow the instructions provided by the `pm2 startup` command.

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