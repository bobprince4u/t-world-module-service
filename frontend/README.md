# T-World Frontend

The frontend is a React and TypeScript application built with Vite and Tailwind CSS. It provides the user interface for authentication, content management, AI summarization, token rewards, conversions, withdrawals, and administrator token balance monitoring.

## Technology Stack

- React
- TypeScript
- Vite
- Tailwind CSS
- Firebase Authentication

## Prerequisites

- Node.js
- npm
- A configured Firebase project
- A running T-World backend API

## Installation

From the `frontend` directory:

```bash
npm install
```

## Environment Configuration

Create a `.env.local` file and provide the Firebase client configuration expected by `src/lib/firebase.ts`.

The frontend also uses the backend API through its API helper in `src/lib/api.ts`.

Do not commit private credentials or environment files.

## Development

Start the development server:

```bash
npm run dev
```

Vite will display the local development URL, usually:

```text
http://localhost:5173
```

## Available Scripts

| Command           | Description                                         |
| ----------------- | --------------------------------------------------- |
| `npm run dev`     | Start the development server                        |
| `npm run build`   | Run TypeScript checks and create a production build |
| `npm run lint`    | Run ESLint                                          |
| `npm run preview` | Preview the production build                        |

## Application Features

### User Features

- Firebase authentication.
- View and create content.
- Generate AI summaries.
- View token balance.
- View token transaction history.
- Convert tokens into simulated digital assets.
- Request simulated withdrawals.

### Administrator Features

- View registered users.
- Monitor user roles and token balances.

## Backend Integration

The frontend communicates with the Express backend through the API helper.

Firebase ID tokens are attached to authenticated requests.

Refer to the root [README](../README.md) and [API Documentation](../docs/api.md) for backend setup and endpoint details.
