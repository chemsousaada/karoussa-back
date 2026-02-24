# NestJS Backend Setup Guide

## 🎯 Step-by-Step Setup

### Step 1: Prerequisites
Ensure you have installed:
- **Node.js 18+** ([download](https://nodejs.org))
- **PostgreSQL 12+** ([download](https://www.postgresql.org/download))
- **npm** (comes with Node.js)

### Step 2: Database Setup

#### Option A: Local PostgreSQL (Windows)
```bash
# Create database and user
psql -U postgres

# In PostgreSQL shell:
CREATE USER autotrader WITH PASSWORD 'autotrader';
CREATE DATABASE autotrader OWNER autotrader;
GRANT ALL PRIVILEGES ON DATABASE autotrader TO autotrader;
\q
```

#### Option B: Docker (Recommended)
```bash
# Pull and run PostgreSQL container
docker pull postgres:15
docker run --name autotrader-db \
  -e POSTGRES_USER=autotrader \
  -e POSTGRES_PASSWORD=autotrader \
  -e POSTGRES_DB=autotrader \
  -p 5432:5432 \
  -d postgres:15
```

### Step 3: Backend Installation

```bash
# Navigate to backend directory
cd c:\autotrader\backend

# Install dependencies
npm install

# Verify installation
npm run build

# Should output: ✓ Compiled successfully
```

### Step 4: Start Backend

```bash
# Development mode (with auto-reload)
npm run start:dev

# You should see:
# ✅ Backend running on http://localhost:3001
```

### Step 5: Connect Frontend

```bash
# In frontend project (c:\autotrader\project)
# Create/update .env.local:

NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
```

Then restart the frontend dev server:
```bash
cd c:\autotrader\project
npm run dev
```

## ✅ Verification

### Test Backend Health

```bash
# 1. Check login endpoint
curl -X POST http://localhost:3001/api/mock/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'

# You should get a response with user and token
```

### Test Database Connection

```bash
# Check PostgreSQL
psql -U autotrader -d autotrader -c "\dt"

# You should see the tables created:
# - users
# - vehicles
# - articles
# - faqs
# etc.
```

### Test Frontend Integration

```bash
# 1. Start frontend (http://localhost:3000)
# 2. Try to login with:
#    Email: test@example.com
#    Password: password123
# 3. You should be redirected to /account
```

## 🔧 Common Issues & Solutions

### Issue: "Connection refused on 5432"
**Solution**:
```bash
# Check if PostgreSQL is running
# Docker:
docker ps | grep postgres

# Local:
pg_isready -h localhost -p 5432
```

### Issue: "Module not found" errors
**Solution**:
```bash
# Clear and reinstall
rm -r node_modules package-lock.json
npm install
npm run build
```

### Issue: "JWT Secret not configured"
**Solution**:
```bash
# Update .env
JWT_SECRET=your-dev-secret-key-here
```

### Issue: "CORS error from frontend"
**Solution**:
Frontend already has CORS enabled for localhost:3000 and localhost:3001. If using different port:

```typescript
// src/main.ts - Update CORS origins:
app.enableCors({
  origin: ['http://localhost:3000', 'http://your-new-port'],
  credentials: true,
});
```

## 📊 Database Structure

Tables automatically created on startup:

### Users
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR UNIQUE,
  password VARCHAR,
  firstName VARCHAR,
  lastName VARCHAR,
  phone VARCHAR,
  preferences JSONB,
  subscriptionPlan VARCHAR,
  createdAt TIMESTAMP,
  updatedAt TIMESTAMP
);
```

### Vehicles
```sql
CREATE TABLE vehicles (
  id UUID PRIMARY KEY,
  make VARCHAR,
  model VARCHAR,
  year INTEGER,
  price DECIMAL(10,2),
  mileage INTEGER,
  transmission VARCHAR,
  fuelType VARCHAR,
  bodyType VARCHAR,
  description TEXT,
  rating DECIMAL,
  reviewCount INTEGER,
  seller VARCHAR,
  location VARCHAR,
  images TEXT[],
  isActive BOOLEAN,
  createdAt TIMESTAMP,
  updatedAt TIMESTAMP
);
```

### SavedAdverts
```sql
CREATE TABLE saved_adverts (
  id UUID PRIMARY KEY,
  userId UUID REFERENCES users(id),
  vehicleId UUID REFERENCES vehicles(id),
  savedAt TIMESTAMP
);
```

### SavedSearches
```sql
CREATE TABLE saved_searches (
  id UUID PRIMARY KEY,
  userId UUID REFERENCES users(id),
  name VARCHAR,
  filters JSONB,
  createdAt TIMESTAMP
);
```

### Articles
```sql
CREATE TABLE articles (
  id UUID PRIMARY KEY,
  title VARCHAR,
  content TEXT,
  author VARCHAR,
  category VARCHAR,
  tags TEXT[],
  views INTEGER,
  createdAt TIMESTAMP
);
```

### FAQs
```sql
CREATE TABLE faqs (
  id UUID PRIMARY KEY,
  question VARCHAR,
  answer TEXT,
  category VARCHAR,
  order INTEGER,
  active BOOLEAN,
  createdAt TIMESTAMP
);
```

### ContactSubmissions
```sql
CREATE TABLE contact_submissions (
  id UUID PRIMARY KEY,
  name VARCHAR,
  email VARCHAR,
  subject VARCHAR,
  message TEXT,
  type VARCHAR,
  resolved BOOLEAN,
  submittedAt TIMESTAMP
);
```

## 🚀 Production Deployment

### Environment Variables for Production

```env
# .env.production
DB_HOST=prod-db.example.com
DB_PORT=5432
DB_USERNAME=prod_user
DB_PASSWORD=strong-secure-password
DB_NAME=autotrader_prod

JWT_SECRET=very-long-random-production-secret-key

PORT=3001
NODE_ENV=production
```

### Build for Production

```bash
npm run build
npm run start:prod
```

### Docker Deployment

```bash
# Build image
docker build -t autotrader-backend:1.0.0 .

# Push to registry (e.g., Docker Hub)
docker tag autotrader-backend:1.0.0 yourregistry/autotrader-backend:1.0.0
docker push yourregistry/autotrader-backend:1.0.0

# Or use docker-compose
docker-compose -f docker-compose.yml up -d
```

## 📝 Useful Commands

```bash
# Development
npm run start:dev      # Start with auto-reload
npm run start:debug    # Debug mode

# Production
npm run build          # Build project
npm run start:prod     # Run production build

# Testing
npm run test           # Run tests
npm run test:watch    # Watch mode
npm run test:cov      # Coverage report

# Code Quality
npm run lint          # Run linter
npm run format        # Format code

# Database
npm run typeorm migration:generate -- -n MigrationName  # Generate migration
npm run typeorm migration:run                            # Run migrations
```

## 🎓 Learning Resources

- [NestJS Quickstart](https://docs.nestjs.com/first-steps)
- [TypeORM Guide](https://typeorm.io/usage-with-databases/databases/postgres)
- [PostgreSQL Tutorial](https://www.postgresqltutorial.com)
- [JWT Authentication](https://datatracker.ietf.org/doc/html/rfc7519)
- [REST API Best Practices](https://restfulapi.net)

## ✨ What's Implemented

✅ **21 API Endpoints** - All endpoints from frontend contract
✅ **JWT Authentication** - Secure token-based auth
✅ **Database** - Full PostgreSQL schema with relations
✅ **Validation** - Request body validation
✅ **Error Handling** - Global exception filters
✅ **CORS** - Configured for frontend
✅ **Seeding** - Auto-seed vehicles, articles, FAQs
✅ **Docker** - Ready for containerization
✅ **Type Safety** - Full TypeScript support

## 🎯 Next Steps

1. ✅ Install dependencies: `npm install`
2. ✅ Start PostgreSQL (Docker or local)
3. ✅ Start backend: `npm run start:dev`
4. ✅ Update frontend `.env`
5. ✅ Start frontend: `npm run dev`
6. ✅ Login and test features
7. ✅ (Optional) Deploy to production

## 📞 Troubleshooting

**Q: Backend starts but frontend can't connect?**
A: Ensure `NEXT_PUBLIC_API_BASE_URL=http://localhost:3001` in frontend `.env`

**Q: Database tables don't exist?**
A: TypeORM syncs automatically. Check that PostgreSQL is running and credentials are correct.

**Q: Login fails?**
A: Default test user is created on first request. Or manually register via `/api/mock/auth/register`

**Q: Port 3001 already in use?**
A: Change PORT in `.env` or kill the process using the port:
```bash
# Windows: find process on port 3001
netstat -ano | findstr :3001
taskkill /PID <PID> /F
```

---

**Ready to start? Run:** `npm run start:dev`
