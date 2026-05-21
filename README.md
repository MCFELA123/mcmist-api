# Mist Backend API

Simple Express.js backend for Mist product management with admin CRUD operations.

## Setup

### Prerequisites
- Node.js 16+ 
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set admin token (optional, defaults to `admin-secret-token-2026`):
```bash
export ADMIN_TOKEN="your-custom-token"
```

### Running

**Development mode:**
```bash
npm run dev:backend
```

**Run both frontend and backend concurrently:**
```bash
npm run dev:all
```

**Production:**
```bash
npm run build:backend
npm run start:backend
```

## API Endpoints

### Public Endpoints

- `GET /api/products` - Get all products
- `GET /api/products/:id` - Get single product
- `GET /api/health` - Health check

### Admin Endpoints (Require Authorization)

- `POST /api/products` - Create new product
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product
- `POST /api/seed` - Seed initial database

**Authentication:**
All admin endpoints require `Authorization: Bearer <ADMIN_TOKEN>` header.

Default token: `admin-secret-token-2026`

## Database

Products are stored in `backend/products.json` with automatic persistence.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 5000 | Server port |
| ADMIN_TOKEN | admin-secret-token-2026 | Admin authentication token |
| NODE_ENV | development | Environment |

## Example Requests

### Create Product
```bash
curl -X POST http://localhost:5000/api/products \
  -H "Authorization: Bearer admin-secret-token-2026" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "New Product",
    "tag": "Premium",
    "description": "Product description",
    "image": "https://example.com/image.jpg",
    "price": 99.99,
    "discount": 10,
    "isPopular": true,
    "isNew": true,
    "type": "Standard",
    "collection": "Professional",
    "colors": ["#000", "#fff"],
    "variations": ["Small", "Large"]
  }'
```

### Update Product
```bash
curl -X PUT http://localhost:5000/api/products/1 \
  -H "Authorization: Bearer admin-secret-token-2026" \
  -H "Content-Type: application/json" \
  -d '{"price": 129.99}'
```

### Delete Product
```bash
curl -X DELETE http://localhost:5000/api/products/1 \
  -H "Authorization: Bearer admin-secret-token-2026"
```

## Troubleshooting

- **Port 5000 already in use:** Change PORT environment variable
- **Products not persisting:** Check write permissions on `backend/` directory
- **Unauthorized errors:** Verify admin token in header matches ADMIN_TOKEN env var
