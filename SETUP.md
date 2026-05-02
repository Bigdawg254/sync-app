# 🚀 Sync App - Development & Deployment Guide

> Making WhatsApp + Omegle + More Beautiful Than Ever

## 📋 Quick Start

### Prerequisites
- Node.js v16+ 
- npm or yarn
- Docker & Docker Compose (optional)
- Expo CLI: `npm install -g expo-cli`

### 1️⃣ Clone & Setup

```bash
git clone https://github.com/Bigdawg254/sync-app.git
cd sync-app

# Install dependencies
npm install
cd frontend && npm install
cd ../backend && npm install
```

### 2️⃣ Configure Environment

```bash
# Copy and configure backend environment
cp backend/.env.example backend/.env

# Edit backend/.env with your credentials
# Critical vars to update:
# - DB_PASSWORD (change from default)
# - JWT_SECRET (generate a secure key)
# - EMAIL credentials
# - Cloudinary API keys
```

### 3️⃣ Start Development

#### Option A: Docker (Recommended)
```bash
docker-compose up -d
# This starts: Backend, PostgreSQL, Redis
# Logs: docker-compose logs -f
```

#### Option B: Local Development
```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npx expo start

# Press 'i' for iOS, 'a' for Android, 'w' for web
```

## 🎨 Features Overview

### ✨ WhatsApp Killer Features
- 💬 **Real-time Messaging** - Instant message delivery with Socket.IO
- 📱 **Cross-Platform** - iOS, Android, Web in one app
- 🔐 **End-to-End Secure** - JWT auth + bcrypt passwords
- 👥 **User Connections** - Friend requests & connection management
- 🖼️ **Rich Media** - Image uploads via Cloudinary
- 🔔 **Notifications** - Real-time push notifications

### 🎮 Omegle Features (With More!)
- 🎲 **Random Matching** - Find random users to chat with
- 📸 **Stories/Status** - Share temporary content (24h expiry)
- ⚡ **Lightning Fast** - Real-time Socket.IO connections
- 🎭 **Anonymous Messaging** - Chat without revealing identity
- 👤 **Profiles** - Customizable user profiles with bio & theme

### 🌟 Unique Features
- 🎨 **Custom Chat Themes** - Personalized messaging experience
- 🔍 **Smart Search** - Find users by name or interests
- 📊 **User Statistics** - See your activity & connections
- ⚙️ **Privacy Controls** - Block, report, delete accounts

## 🔧 Architecture

```
sync-app/
│
├── backend/                    # Node.js Express Server
│   ├── middleware/            # Auth & validation
│   ├── routes/                # API endpoints
│   ├── server.js              # Entry point
│   └── db.js                  # PostgreSQL connection
│
├── frontend/                  # React Native Expo App
│   ├── app/                   # Screens (file-based routing)
│   ├── context/               # Auth context
│   ├── components/            # Reusable components
│   └── app.json              # Expo config
│
├── database/                  # Database schemas
├── docker-compose.yml         # Services config
└── README.md                  # This file
```

## 📚 API Documentation

### Authentication
```
POST /api/auth/register
POST /api/auth/login
GET /api/auth/profile
POST /api/auth/refresh
POST /api/auth/logout
```

### Users
```
GET /api/users/:id
GET /api/users/search?q=query
PUT /api/users/profile
GET /api/users?page=1&limit=20
DELETE /api/users/profile
```

### Messages
```
POST /api/messages/send
GET /api/messages/conversation/:userId
GET /api/messages/inbox
DELETE /api/messages/:messageId
```

### Connections
```
POST /api/connections/request/:userId
PUT /api/connections/accept/:connectionId
PUT /api/connections/reject/:connectionId
GET /api/connections?status=accepted
GET /api/connections/pending
```

### Status/Stories
```
POST /api/status/create
GET /api/status/user/:userId
GET /api/status/feed
DELETE /api/status/:statusId
```

## 🛡️ Security Features

✅ **Implemented**
- JWT authentication with expiry
- Password hashing with bcryptjs (salt rounds: 12)
- Input validation & sanitization
- SQL injection protection via parameterized queries
- CORS configured
- Secure environment variables

🔒 **Production Checklist**
- [ ] Remove hardcoded secrets from code
- [ ] Use HTTPS/TLS
- [ ] Enable rate limiting
- [ ] Add request logging
- [ ] Set up monitoring
- [ ] Configure backup system
- [ ] Enable database encryption
- [ ] Add 2FA support
- [ ] Implement token blacklist (Redis)
- [ ] Use strong JWT secrets (min 32 chars)

## 📱 Frontend Screens

### Authentication Flow
- **Login** - Beautiful animated login screen
- **Sign Up** - Registration with validation
- **Forgot Password** - (To be implemented)

### Main App
- **Explore** - Discover and search users
- **Stories** - View statuses with swipe navigation
- **Chat** - Real-time messaging with animations
- **Profile** - User profile customization
- **Settings** - App preferences
- **Notifications** - Alert center

## 🚀 Deployment

### Backend Deployment (Render/Railway/Heroku)
```bash
# 1. Push to GitHub
git push origin main

# 2. Connect repository to hosting service
# 3. Set environment variables
# 4. Deploy with: npm start

# Test health endpoint
curl https://your-app.com/health
```

### Frontend Deployment (Expo)
```bash
# Build APK/IPA
cd frontend
eas build --platform android
eas build --platform ios

# Or submit to app stores
eas submit --platform android
eas submit --platform ios
```

### Database (PostgreSQL Hosting)
- Recommended: AWS RDS, Render, Neon
- Update `DATABASE_URL` in backend `.env`

## 🐛 Troubleshooting

### Backend won't start
```bash
# Check port 5000 is free
lsof -i :5000

# Check database connection
psql postgresql://user:password@host:5432/sync_db

# Check environment variables
cat backend/.env
```

### Frontend can't connect to backend
```bash
# Ensure backend is running
curl http://localhost:5000/health

# Update EXPO_PUBLIC_API_URL in frontend/.env
EXPO_PUBLIC_API_URL=http://192.168.1.XX:5000

# For production, use actual domain
EXPO_PUBLIC_API_URL=https://api.sync-app.com
```

### Database errors
```bash
# Reset database
docker-compose down
docker-compose up -d

# Check logs
docker-compose logs db

# Access PostgreSQL CLI
psql postgresql://postgres:password@localhost:5433/sync_db
```

## 📈 Performance Tips

1. **Enable Caching** - Redis for sessions
2. **Optimize Images** - Compress before upload
3. **Pagination** - Implement for large lists
4. **Lazy Loading** - Load messages on scroll
5. **Debounce** - Search queries with debounce
6. **Bundle Size** - Tree shake unused code

## 🤝 Contributing

1. Create feature branch: `git checkout -b feature/amazing-feature`
2. Commit changes: `git commit -m 'Add amazing feature'`
3. Push branch: `git push origin feature/amazing-feature`
4. Open Pull Request

## 📄 License

This project is open source. See LICENSE file for details.

## 🎯 Roadmap

- [ ] Voice/Video calling (Agora integration ready)
- [ ] End-to-end encryption
- [ ] Group chats
- [ ] Message search
- [ ] Read receipts
- [ ] Typing indicators
- [ ] Channel/Communities
- [ ] Payments integration
- [ ] Admin dashboard
- [ ] Content moderation

## 💬 Support

For issues or questions:
- Open an issue on GitHub
- Check existing documentation
- Contact: brianomwando035@gmail.com

---

<div align="center">

**Made with ❤️ & ⚡ by [Bigdawg254](https://github.com/Bigdawg254)**

[Report Bug](https://github.com/Bigdawg254/sync-app/issues) · [Request Feature](https://github.com/Bigdawg254/sync-app/issues) · [Live Demo](https://sync-app-hazel.vercel.app)

</div>
