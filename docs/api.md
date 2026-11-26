# API Documentation

Base URL (local development):

```text
http://localhost:5000
```

All endpoints are prefixed with `/api`, except `/health`.

## Authentication

Protected endpoints require a valid Firebase ID token.

Include the token in the request header:

```http
Authorization: Bearer <FIREBASE_ID_TOKEN>
```

Administrator endpoints additionally require the authenticated user to have the `admin` role.

## Health Check

### GET /health

Checks API availability and database readiness.

- `200 OK`: API and database are ready.
- `503 Service Unavailable`: Database is not ready.

## Authentication

### GET /api/auth/me

**Access:** Authenticated

Returns the current authenticated user's profile.

## Content

### POST /api/content

**Access:** Authenticated

Creates a content record.

Request body:

```json
{
  "title": "Introduction to Software Engineering",
  "body": "Software engineering is the systematic approach to building software.",
  "tags": ["technology", "engineering"]
}
```

Validation:

- `title`: Required, non-empty string.
- `body`: Required, non-empty string.
- `tags`: Optional array of non-empty strings.

Successful response: `201 Created`.

### GET /api/content

**Access:** Public

Retrieves paginated content.

Query parameters:

| Parameter | Description                             |
| --------- | --------------------------------------- |
| page      | Page number; defaults to 1              |
| tag       | Optional tag filter                     |
| q         | Optional search term for title and body |

Example:

```text
GET /api/content?page=1&tag=technology&q=engineering
```

Returns content items and pagination metadata.

### GET /api/content/:id

**Access:** Public

Retrieves a content record using its MongoDB ID.

- `200 OK`: Content found.
- `400 Bad Request`: Invalid content ID.
- `404 Not Found`: Content does not exist.

## AI Summarization

### POST /api/content/:id/ai/summarize

**Access:** Authenticated

Generates an AI summary for a content record.

Request body:

```json
{
  "tone": "professional",
  "length": "medium"
}
```

Supported values:

| Field  | Accepted values                | Default      |
| ------ | ------------------------------ | ------------ |
| tone   | professional, friendly, simple | professional |
| length | short, medium, long            | medium       |

Successful response includes:

- Generated summary.
- AI run ID.
- Tokens awarded.
- Updated token balance.

A successful summarization awards 5 tokens.

Possible errors:

- `400 Bad Request`: Invalid content ID or summarization options.
- `404 Not Found`: Content does not exist.
- `502 Bad Gateway`: AI provider failure.
- `504 Gateway Timeout`: AI provider timeout.

## Token Management

### GET /api/tokens/balance

**Access:** Authenticated

Returns the authenticated user's token balance.

### GET /api/tokens/history

**Access:** Authenticated

Returns paginated token transaction history.

Query parameter:

| Parameter | Description                         |
| --------- | ----------------------------------- |
| page      | Positive page number; defaults to 1 |

Transactions include their type, source, amount, resulting balance, and reference ID.

### POST /api/tokens/convert

**Access:** Authenticated

Converts tokens into a simulated digital asset.

Request body:

```json
{
  "toAsset": "MOCK_USDT",
  "amount": 100
}
```

Supported assets:

- `MOCK_USDT`
- `MOCK_ETH`

Conversion rates:

| Token Amount | Asset Received |
| ------------ | -------------- |
| 100 tokens   | 1 MOCK_USDT    |
| 200 tokens   | 0.01 MOCK_ETH  |

The operation records the conversion and updates the user's token balance.

Possible errors include invalid input, insufficient balance, and missing user profile.

### POST /api/tokens/withdraw

**Access:** Authenticated

Simulates withdrawal of eligible converted assets.

No request body is required.

The operation records the simulated withdrawal details. It does not transfer real cryptocurrency or funds.

### GET /api/tokens/users

**Access:** Admin

Returns paginated user token balances.

Query parameter:

| Parameter | Description                         |
| --------- | ----------------------------------- |
| page      | Positive page number; defaults to 1 |

Each user record includes email, role, token balance, and creation date.

Unauthorized users receive `401 Unauthorized`; authenticated non-admin users receive `403 Forbidden`.

## Media Management

### POST /api/media/upload

**Access:** Authenticated

Uploads a temporary media file to Cloudinary.

Content type:

```http
Content-Type: multipart/form-data
```

Form field:

```text
file
```

Maximum upload size: 10 MB.

The operation stores media metadata and returns the created media record.

### POST /api/media/:id/promote

**Access:** Authenticated

Promotes an uploaded media record from Cloudinary to AWS S3.

The authenticated user must own the media record.

The operation updates the media record with the S3 key, S3 URL, and promoted status.

Possible errors include invalid media ID, missing media record, and ownership violations.

## Common HTTP Status Codes

| Status | Meaning                                    |
| ------ | ------------------------------------------ |
| 200    | Request successful                         |
| 201    | Resource created                           |
| 400    | Invalid request or business rule violation |
| 401    | Authentication required or invalid         |
| 403    | Insufficient permissions                   |
| 404    | Resource not found                         |
| 413    | Uploaded file exceeds the allowed size     |
| 429    | Rate limit exceeded                        |
| 500    | Internal server error                      |
| 502    | External provider failure                  |
| 503    | Service or database unavailable            |
| 504    | External provider timeout                  |

## Notes

- Protected routes require Firebase authentication.
- Administrator routes require the `admin` role.
- Request validation is handled with Zod.
- Token rewards and conversion records are persisted in MongoDB.
- Digital asset conversions and withdrawals are simulations.
