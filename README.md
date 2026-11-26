# T-World Module Service

T-World is a content management and AI-powered rewards application. It allows users to create and browse content, generate AI summaries, earn tokens, convert tokens into simulated digital assets, and request simulated withdrawals. Administrators can also monitor user token balances.

## Features

- Firebase authentication.
- Role-based access control for users and administrators.
- Content creation and retrieval.
- Content search, tag filtering, and pagination.
- AI-powered content summarization with configurable tone and length.
- AI execution tracking, including status and processing latency.
- Automatic token rewards for successful AI summarization.
- Token balance and transaction history.
- Token conversion into simulated MOCK_USDT and MOCK_ETH assets.
- Simulated asset withdrawals.
- Temporary media uploads to Cloudinary.
- Media promotion from Cloudinary to AWS S3.
- Request validation and centralized error handling.
- Security headers, CORS configuration, and API rate limiting.

## Technology Stack

### Backend

- Node.js
- TypeScript
- Express.js
- MongoDB
- Mongoose
- Zod
- Firebase Admin SDK

### Frontend

- React
- TypeScript
- Vite
- Tailwind CSS
- Firebase Authentication

### Cloud Storage

- Cloudinary
- AWS S3

### Testing

- Node.js Test Runner
- TypeScript
- MongoDB Memory Server

## Project Structure

```text
t-world-module-service/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── types/
│   │   └── validators/
│   └── tests/
├── frontend/
│   └── src/
│       ├── assets/
│       └── lib/
├── docs/
└── README.md
```

## Prerequisites

Before running the application, ensure you have:

- Node.js and npm installed.
- A MongoDB database.
- A Firebase project with Authentication enabled.
- A Cloudinary account.
- An AWS account with an S3 bucket configured.

Cloudinary and AWS credentials are required for the media upload and promotion functionality.

## Installation and Setup

### 1. Clone the Repository

```bash
git clone https://github.com/bobprince4u/t-world-module-service.git
cd t-world-module-service
```

### 2. Configure the Backend

```bash
cd backend
npm install
cp .env.example .env
```

Update the `.env` file with your configuration:

| Variable                      | Description                           |
| ----------------------------- | ------------------------------------- |
| NODE_ENV                      | Application environment               |
| PORT                          | Backend server port                   |
| MONGODB_URI                   | MongoDB connection string             |
| CLIENT_URL                    | Frontend URL allowed by CORS          |
| FIREBASE_PROJECT_ID           | Firebase project ID                   |
| FIREBASE_SERVICE_ACCOUNT_PATH | Path to Firebase service account JSON |
| AI_PROVIDER                   | AI provider setting                   |
| GEMINI_API_KEY                | Optional AI provider credential       |
| CLOUDINARY_CLOUD_NAME         | Cloudinary cloud name                 |
| CLOUDINARY_API_KEY            | Cloudinary API key                    |
| CLOUDINARY_API_SECRET         | Cloudinary API secret                 |
| AWS_REGION                    | AWS region                            |
| AWS_S3_BUCKET                 | S3 bucket name                        |
| AWS_ACCESS_KEY_ID             | AWS access key                        |
| AWS_SECRET_ACCESS_KEY         | AWS secret key                        |

Never commit actual credentials, private keys, or service-account files to the repository.

### 3. Start the Backend

From the `backend` directory:

```bash
npm run dev
```

The backend runs at:

```text
http://localhost:5000
```

### 4. Configure the Frontend

Open another terminal:

```bash
cd frontend
npm install
```

Configure the Firebase client environment variables in `frontend/.env.local` using the Firebase configuration expected by the frontend.

### 5. Start the Frontend

From the `frontend` directory:

```bash
npm run dev
```

Vite will display the frontend URL, usually:

```text
http://localhost:5173
```

## Available Scripts

### Backend

Run these commands inside the `backend` directory.

| Command         | Description                  |
| --------------- | ---------------------------- |
| `npm run dev`   | Start the development server |
| `npm run build` | Compile TypeScript           |
| `npm start`     | Start the compiled server    |
| `npm test`      | Run backend tests            |

### Frontend

Run these commands inside the `frontend` directory.

| Command           | Description                          |
| ----------------- | ------------------------------------ |
| `npm run dev`     | Start the Vite development server    |
| `npm run build`   | Type-check and build the application |
| `npm run lint`    | Run ESLint                           |
| `npm run preview` | Preview the production build         |

## API Documentation

All API endpoints use the `/api` prefix, except the health endpoint.

| Method | Endpoint                        | Access        | Description                          |
| ------ | ------------------------------- | ------------- | ------------------------------------ |
| GET    | `/health`                       | Public        | Check API and database readiness     |
| GET    | `/api/auth/me`                  | Authenticated | Retrieve current user profile        |
| POST   | `/api/content`                  | Authenticated | Create content                       |
| GET    | `/api/content`                  | Public        | List, search, and filter content     |
| GET    | `/api/content/:id`              | Public        | Retrieve content by ID               |
| POST   | `/api/content/:id/ai/summarize` | Authenticated | Generate an AI summary               |
| GET    | `/api/tokens/balance`           | Authenticated | Retrieve token balance               |
| GET    | `/api/tokens/history`           | Authenticated | Retrieve token transaction history   |
| POST   | `/api/tokens/convert`           | Authenticated | Convert tokens into simulated assets |
| POST   | `/api/tokens/withdraw`          | Authenticated | Simulate an asset withdrawal         |
| GET    | `/api/tokens/users`             | Admin         | Retrieve user token balances         |
| POST   | `/api/media/upload`             | Authenticated | Upload temporary media               |
| POST   | `/api/media/:id/promote`        | Authenticated | Promote uploaded media to AWS S3     |

## Token Reward and Conversion System

Successful AI summarization awards users 5 tokens.

Token transactions are recorded with their transaction type, source, amount, resulting balance, and reference ID.

The application supports the following simulated conversion rates:

| Token Amount | Converted Asset |
| ------------ | --------------- |
| 100 tokens   | 1 MOCK_USDT     |
| 200 tokens   | 0.01 MOCK_ETH   |

Token conversion operations use MongoDB transactions to maintain consistency between user balances, transaction records, and conversion records.

Withdrawals are simulated and do not interact with real blockchain networks.

## Database Models

The application uses the following MongoDB models:

| Model              | Purpose                                                      |
| ------------------ | ------------------------------------------------------------ |
| User               | Stores Firebase identity, email, role, and token balance     |
| Content            | Stores content title, body, tags, and creator                |
| AiRun              | Records AI execution status, output, latency, and rewards    |
| TokenTransaction   | Records token earnings, conversions, and withdrawals         |
| ContractConversion | Stores simulated asset conversion and withdrawal records     |
| Media              | Tracks temporary Cloudinary uploads and S3 promotion details |

## Security

- Firebase ID tokens are used for authentication.
- Role-based middleware protects administrator endpoints.
- Zod validates incoming request data.
- Helmet adds HTTP security headers.
- CORS restricts permitted frontend origins.
- API rate limiting helps prevent excessive requests.
- Media operations enforce authenticated user ownership.
- Sensitive credentials should be stored in environment variables and never committed.

## Important Notes

- MOCK_USDT and MOCK_ETH are simulated assets, not real cryptocurrencies.
- Withdrawals are simulated and do not transfer actual funds.
- The current AI summarization implementation uses a mock AI provider.
- Cloudinary and AWS S3 functionality requires valid provider credentials.
- Administrator privileges should only be assigned through a trusted server-side process.

## Documentation

Additional technical documentation:

- [API Documentation](docs/api.md)
- [System Architecture](docs/architecture.md)
