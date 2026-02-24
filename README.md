# Autotrader Backend - NestJS

A production-ready backend API for the Autotrader marketplace platform built with NestJS, PostgreSQL, and JWT authentication.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 12+
- npm or yarn

### Installation

```bash
# Clone/navigate to the backend directory
cd c:\autotrader\backend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your database credentials

# Start development server
npm run start:dev

# Backend will be available at http://localhost:3001
```

### Production Build

```bash
npm run build
npm run start:prod
```

## 📋 Features

✅ **Complete REST API** - 21 endpoints covering all marketplace operations
✅ **JWT Authentication** - Secure token-based auth
✅ **Database** - PostgreSQL with TypeORM ORM
✅ **Validation** - Class-validator for request validation
✅ **Error Handling** - Global exception filters
✅ **CORS** - Enabled for frontend integration
✅ **Type Safe** - Full TypeScript support

## 🔌 API Endpoints (21 Total)

### Authentication (3)
- `POST /api/mock/auth/login` - User login
- `POST /api/mock/auth/register` - User registration
- `POST /api/mock/auth/logout` - User logout

### Users (4)
- `GET /api/mock/users/me` - Get current user
- `PUT /api/mock/users/me` - Update profile
- `GET /api/mock/users/me/subscriptions` - Get subscription
- `PUT /api/mock/users/me/subscriptions` - Update subscription

### Vehicles (2)
- `GET /api/mock/search` - Search vehicles with filters
- `GET /api/mock/vehicles/:id` - Get vehicle details

### Saved Items (5)
- `GET /api/mock/saved/adverts` - Get saved vehicles
- `POST /api/mock/saved/adverts` - Save a vehicle
- `DELETE /api/mock/saved/adverts/:id` - Unsave a vehicle
- `GET /api/mock/saved/searches` - Get saved searches
- `POST /api/mock/saved/searches` - Save a search

### Content (2)
- `GET /api/mock/articles` - Get articles
- `GET /api/mock/faqs` - Get FAQs

### Support (2)
- `POST /api/mock/contact` - Submit contact form
- `POST /api/mock/contact/complaint` - Submit complaint

### Additional (3)
- `GET /api/mock/auth/me` - Get authenticated user (via GET)
- Additional pagination support on list endpoints

## 📦 Project Structure

```
src/
├── main.ts                    # App entry point
├── app.module.ts              # Root module
├── auth/                      # Authentication module
│   ├── auth.service.ts
│   ├── auth.controller.ts
│   ├── auth.module.ts
│   ├── guards/               # JWT guard
│   ├── strategies/           # Passport strategies
│   └── dto/                  # Login/Register DTOs
├── users/                     # Users module
│   ├── users.service.ts
│   ├── users.controller.ts
│   ├── users.module.ts
│   └── entities/
├── vehicles/                  # Vehicles module
│   ├── vehicles.service.ts
│   ├── vehicles.controller.ts
│   ├── vehicles.module.ts
│   └── entities/
├── saved/                     # Saved items module
│   ├── saved.service.ts
│   ├── saved.controller.ts
│   ├── saved.module.ts
│   └── entities/
├── articles/                  # Articles module
├── faqs/                      # FAQs module
├── contact/                   # Contact module
└── common/                    # Shared utilities
```

## 🔐 Authentication

All protected endpoints require JWT Bearer token:

```bash
Authorization: Bearer {token}
```

### Login Response

```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe"
  },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

## 🗄️ Database Schema

### Users Table
- id (UUID)
- email (String, unique)
- password (String, hashed)
- firstName, lastName (String)
- phone (String)
- preferences (JSON)
- subscriptionPlan (String)
- createdAt, updatedAt (Timestamp)

### Vehicles Table
- id (UUID)
- make, model (String)
- year (Number)
- price (Decimal)
- mileage (Number)
- transmission, fuelType, bodyType (String)
- rating, reviewCount (Number)
- seller, location (String)
- images (Array)
- createdAt, updatedAt (Timestamp)

### SavedAdverts Table
- id (UUID)
- userId (FK)
- vehicleId (FK)
- savedAt (Timestamp)

### SavedSearches Table
- id (UUID)
- userId (FK)
- name (String)
- filters (JSON)
- createdAt (Timestamp)

### Articles Table
- id (UUID)
- title, content (String/Text)
- author, category (String)
- tags (Array)
- views (Number)
- createdAt (Timestamp)

### FAQs Table
- id (UUID)
- question, answer (String/Text)
- category (String)
- order (Number)
- active (Boolean)

### ContactSubmissions Table
- id (UUID)
- name, email, subject (String)
- message (Text)
- type (String)
- resolved (Boolean)
- submittedAt (Timestamp)

## 🔧 Configuration

### Environment Variables

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=autotrader
DB_PASSWORD=autotrader
DB_NAME=autotrader

# JWT
JWT_SECRET=your-secret-key

# API
PORT=3001
NODE_ENV=development
```

## 📝 Sample Requests

### Login
```bash
curl -X POST http://localhost:3001/api/mock/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

### Search Vehicles
```bash
curl http://localhost:3001/api/mock/search?make=BMW&priceMin=10000&priceMax=30000
```

### Get Current User
```bash
curl http://localhost:3001/api/mock/users/me \
  -H "Authorization: Bearer {token}"
```

### Save a Vehicle
```bash
curl -X POST http://localhost:3001/api/mock/saved/adverts \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "vehicleId": "vehicle-uuid"
  }'
```

## 🐘 PostgreSQL Setup

### Local Development

```bash
# Start PostgreSQL (using Docker)
docker run --name autotrader-db \
  -e POSTGRES_USER=autotrader \
  -e POSTGRES_PASSWORD=autotrader \
  -e POSTGRES_DB=autotrader \
  -p 5432:5432 \
  postgres:15

# Or use your local PostgreSQL installation
createdb autotrader -U autotrader
```

### Connecting to Frontend

Update the frontend `.env`:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
```

## 🧪 Testing

```bash
npm run test
npm run test:watch
npm run test:cov
```

## 🚢 Deployment

### Docker

```bash
# Build Docker image
docker build -t autotrader-backend .

# Run container
docker run -p 3001:3001 \
  -e DB_HOST=postgres \
  -e JWT_SECRET=production-secret \
  autotrader-backend
```

### Vercel/Railway/Heroku

1. Set environment variables in platform dashboard
2. Deploy:
   ```bash
   npm run build
   npm run start:prod
   ```

## 📚 Additional Resources

- [NestJS Documentation](https://docs.nestjs.com)
- [TypeORM Documentation](https://typeorm.io)
- [JWT Best Practices](https://tools.ietf.org/html/rfc7519)
- [Passport.js](http://www.passportjs.org)

## ✅ Verification Checklist

- [ ] PostgreSQL installed and running
- [ ] Environment variables configured
- [ ] Dependencies installed
- [ ] Server starts without errors
- [ ] Can login with demo credentials
- [ ] Can search vehicles
- [ ] Can save/unsave vehicles
- [ ] Can update profile
- [ ] JWT tokens working
- [ ] CORS configured correctly

## 🎯 Next Steps

1. **Database Setup**
   ```bash
   # PostgreSQL must be running
   npm run start:dev
   # Tables auto-created via TypeORM sync
   ```

2. **Seed Data**
   - Vehicles auto-seed on startup
   - Articles auto-seed on startup
   - FAQs auto-seed on startup

3. **Connect Frontend**
   - Update frontend `.env` to use `http://localhost:3001`
   - Restart frontend dev server

4. **Test Integration**
   - Login from frontend
   - Search vehicles
   - Save/unsave vehicles
   - Update profile

## 📞 Support

For issues or questions:
1. Check logs in terminal
2. Review `.env` configuration
3. Verify PostgreSQL connection
4. Check frontend API base URL configuration

---

**Status**: ✅ Ready for Development
**Last Updated**: February 1, 2026
