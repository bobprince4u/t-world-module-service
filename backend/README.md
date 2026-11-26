# T-World Backend API

The T-World backend is a REST API built with Node.js, TypeScript, Express, and MongoDB. It provides authentication, content management, AI summarization, token rewards, simulated asset conversion, withdrawals, and media storage operations.

## Technology Stack

- Node.js
- TypeScript
- Express.js
- MongoDB
- Mongoose
- Zod
- Firebase Admin SDK
- Cloudinary
- AWS S3

## Prerequisites

- Node.js and npm
- MongoDB database
- Firebase project with Authentication enabled
- Firebase service account credentials
- Cloudinary account
- AWS account with an S3 bucket

## Installation

From the `backend` directory:

```bash
npm install
```

## Environment Configuration

Create your local environment file:

```bash
cp .env.example .env
```

Configure the following variables:

| Variable                      | Description                                               |
| ----------------------------- | --------------------------------------------------------- |
| NODE_ENV                      | Application environment: development, production, or test |
| PORT                          | API server port; defaults to 5000                         |
| MONGODB_URI                   | MongoDB connection string                                 |
| CLIENT_URL                    | Frontend origin allowed by CORS                           |
| FIREBASE_PROJECT_ID           | Firebase project ID                                       |
| FIREBASE_SERVICE_ACCOUNT_PATH | Path to Firebase service account JSON                     |
| AI_PROVIDER                   | AI provider setting                                       |
| GEMINI_API_KEY                | Optional AI provider credential                           |
| CLOUDINARY_CLOUD_NAME         | Cloudinary cloud name                                     |
| CLOUDINARY_API_KEY            | Cloudinary API key                                        |
| CLOUDINARY_API_SECRET         | Cloudinary API secret                                     |
| AWS_REGION                    | AWS region                                                |
| AWS_S3_BUCKET                 | S3 bucket name                                            |
| AWS_ACCESS_KEY_ID             | AWS access key                                            |
| AWS_SECRET_ACCESS_KEY         | AWS secret key                                            |

Keep `.env`, service-account credentials, and cloud provider secrets out of version control.

## Running the Server

### Development

```bash
npm run dev
```

### Production Build

```bash
npm run build
```

### Start Production Server

```bash
npm start
```

The default local API address is:

```text
http://localhost:5000
```

Health check:

```text
GET /health
```

## Available Scripts

| Command         | Description                                   |
| --------------- | --------------------------------------------- |
| `npm run dev`   | Run the development server with file watching |
| `npm run build` | Compile TypeScript                            |
| `npm start`     | Start the compiled application                |
| `npm test`      | Execute the backend test suite                |

## API Modules

### Authentication

- Firebase ID token verification.
- Application user resolution.
- Role-based authorization.

### Content Management

- Create content.
- Retrieve content by ID.
- List content with pagination.
- Search content by title and body.
- Filter content by tag.

### AI Summarization

- Generate summaries with configurable tone and length.
- Apply provider timeout handling.
- Record AI execution status and latency.
- Award 5 tokens for successful summarization.

The current summarization implementation uses a mock AI provider.

### Token Management

- Retrieve user token balance.
- Retrieve paginated transaction history.
- Convert tokens into MOCK_USDT or MOCK_ETH.
- Simulate withdrawals.
- Allow administrators to view user token balances.

### Media Management

- Upload temporary files to Cloudinary.
- Promote uploaded media to AWS S3.
- Track media ownership and storage status.
- Enforce a maximum upload size of 10 MB.

## API Routes

| Method | Endpoint                        | Access        |
| ------ | ------------------------------- | ------------- |
| GET    | `/health`                       | Public        |
| GET    | `/api/auth/me`                  | Authenticated |
| POST   | `/api/content`                  | Authenticated |
| GET    | `/api/content`                  | Public        |
| GET    | `/api/content/:id`              | Public        |
| POST   | `/api/content/:id/ai/summarize` | Authenticated |
| GET    | `/api/tokens/balance`           | Authenticated |
| GET    | `/api/tokens/history`           | Authenticated |
| POST   | `/api/tokens/convert`           | Authenticated |
| POST   | `/api/tokens/withdraw`          | Authenticated |
| GET    | `/api/tokens/users`             | Admin         |
| POST   | `/api/media/upload`             | Authenticated |
| POST   | `/api/media/:id/promote`        | Authenticated |

## Database Models

The backend uses the following MongoDB models:

- **User:** Firebase UID, email, role, and token balance.
- **Content:** Content title, body, tags, and creator.
- **AiRun:** AI execution records, output, status, latency, and awarded tokens.
- **TokenTransaction:** Token earnings, conversions, and withdrawals.
- **ContractConversion:** Simulated asset conversions and withdrawal records.
- **Media:** Cloudinary and S3 media metadata.

## Testing

Run the complete test suite:

```bash
npm test
```

Build the backend:

```bash
npm run build
```

## Security

- Firebase authentication protects private endpoints.
- Administrator routes require the `admin` role.
- Zod validates incoming request data.
- Helmet provides HTTP security headers.
- CORS restricts permitted frontend origins.
- Express rate limiting protects API routes.
- Media operations enforce ownership checks.
- MongoDB transactions help maintain consistency during token operations.

## Important Notes

- MOCK_USDT and MOCK_ETH are simulated assets.
- Withdrawals do not transfer real cryptocurrency or funds.
- The current AI summarization flow uses a mock provider.
- Cloudinary and AWS S3 functionality requires valid credentials.
- Administrator privileges must be assigned through a trusted server-side process.

## Related Documentation

- [Project Overview](../README.md)
- [API Documentation](../docs/api.md)
- [System Architecture](../docs/architecture.md)
- [Frontend Documentation](../frontend/README.md)
