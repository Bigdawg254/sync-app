# ⚡ Sync App

> A modern, full-stack synchronization application with a React Native frontend and Node.js backend

[![GitHub license](https://img.shields.io/github/license/Bigdawg254/sync-app)](LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/Bigdawg254/sync-app?style=social)](https://github.com/Bigdawg254/sync-app)
[![Last commit](https://img.shields.io/github/last-commit/Bigdawg254/sync-app)](https://github.com/Bigdawg254/sync-app/commits)

## 📋 Table of Contents

- [About](#about)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Running Locally](#running-locally)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

## 📌 About

Sync App is a comprehensive full-stack application designed to provide seamless synchronization across devices. Built with modern technologies and best practices, it offers a responsive mobile-first experience through Expo while maintaining a robust backend infrastructure.

**Live Demo:** [https://sync-app-hazel.vercel.app](https://sync-app-hazel.vercel.app)

## ✨ Features

- 📱 **Cross-platform Mobile App** - Built with Expo and React Native
- 🔗 **RESTful API** - Node.js backend with Express
- 💾 **Database Integration** - Persistent data storage
- 🐳 **Docker Support** - Easy containerization and deployment
- 🔄 **Real-time Synchronization** - Keep data in sync across devices
- 📦 **TypeScript Support** - Type-safe development (10.4% of codebase)

## 🛠 Tech Stack

### Frontend
- **React Native** with Expo
- **JavaScript/TypeScript**
- File-based routing

### Backend
- **Node.js** with Express
- **JavaScript/TypeScript**
- RESTful API design

### Infrastructure
- **Docker** & Docker Compose
- **Database** (configured in database directory)
- **Vercel** (Production deployment)

## 📂 Project Structure

```
sync-app/
├── frontend/          # React Native/Expo mobile app
│   ├── app/          # Main application code
│   └── app-example/  # Example files (after reset)
├── backend/          # Node.js Express server
├── database/         # Database configuration and migrations
├── docker-compose.yml # Docker compose configuration
├── package.json      # Root dependencies
└── README.md         # This file
```

## 🚀 Getting Started

### Prerequisites

- **Node.js** (v16 or higher)
- **npm** or **yarn**
- **Docker** and **Docker Compose** (optional, for containerized deployment)
- **Expo CLI** (for mobile development)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Bigdawg254/sync-app.git
   cd sync-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   
   # Or install in each directory separately
   cd frontend && npm install
   cd ../backend && npm install
   ```

### Running Locally

#### Frontend (Expo App)

```bash
cd frontend
npm install
npx expo start
```

In the output, you'll find options to open the app in:
- [Expo Go](https://expo.dev/go) - Quick testing
- [iOS Simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Android Emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [Development Build](https://docs.expo.dev/develop/development-builds/introduction/)

#### Backend

```bash
cd backend
npm install
npm start
```

#### Using Docker Compose

```bash
docker-compose up -d
```

This will start all services in containers.

## 📦 Deployment

The app is currently deployed on **Vercel**. For frontend updates:

```bash
# Frontend is automatically deployed on push to main
# Deploy manually if needed
npm run build
npm run deploy
```

## 🤝 Contributing

Contributions are welcome! Here's how to get started:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow the existing code style
- Write clear commit messages
- Test your changes locally
- Update documentation as needed

## 📄 License

This project is open source. Check the LICENSE file for details.

---

<div align="center">

Made by [Bigdawg254](https://github.com/Bigdawg254)

[Report Bug](https://github.com/Bigdawg254/sync-app/issues) · [Request Feature](https://github.com/Bigdawg254/sync-app/issues)

</div>
