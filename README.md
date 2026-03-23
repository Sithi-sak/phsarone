# PhsarOne

PhsarOne is a mobile marketplace application built with Expo and React Native for buying, selling, and trading items. The app includes listing management, trade offers, chat, notifications, subscriptions, multilingual support, AI-assisted search, and image moderation.

This repository contains:
- the Expo mobile app
- Supabase schema and migrations
- a Python AI service for semantic search, recommendations, and image moderation

## Table of Contents
- [Overview](#overview)
- [Core Features](#core-features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Environment Variables](#environment-variables)
- [Installation](#installation)
- [Running the App Locally](#running-the-app-locally)
- [AI Service](#ai-service)
- [Supabase](#supabase)
- [Android APK Build](#android-apk-build)
- [Scripts](#scripts)
- [Important Notes](#important-notes)
- [Known Constraints](#known-constraints)

## Overview
PhsarOne is designed as a marketplace experience with two major transaction flows:
- standard listings for direct buying/selling
- trade listings and trade offers for item-for-item exchange

The app supports:
- account creation and authentication
- creating, editing, drafting, relisting, and managing listings
- seller profiles and subscription plans
- in-app messaging for regular and trade conversations
- location selection and map preview using OpenStreetMap
- AI-powered semantic search and recommendation endpoints
- basic dangerous-item moderation for listing text and images
- English and Khmer localization

## Core Features
### Marketplace
- Create listings with title, description, images, structured details, price, discount, contact information, and location
- Save drafts and publish later
- Edit active listings and relist expired ones
- View categories, filters, product details, seller information, and safety guidance

### Trade Flow
- Create public trade listings
- Send trade offers using an existing trade item
- Create a private trade item directly from the offer flow
- Open or continue trade chat after an offer is sent

### Messaging
- Regular chat and trade chat
- Send:
  - text
  - images
  - location
  - voice messages
- Conversation mute/block actions
- Notifications for messages and trade offers

### Notifications
- In-app notifications list
- Unread badge support
- Read one, read all, and clear all

### Subscription
- Multiple plans with listing and boost limits
- Subscription purchase flow via Stripe
- Manage, cancel, and resume subscription status in-app

### Search and Moderation
- Semantic search using embeddings
- Recommendation endpoint
- Dangerous text moderation for listings
- Dangerous-item image moderation endpoint

### Localization and Theming
- English and Khmer locale files
- Light and dark theme support

## Tech Stack
### Mobile App
- Expo SDK 54
- React Native 0.81
- React 19
- Expo Router
- TypeScript

### Backend and Data
- Supabase
  - Postgres
  - Storage
  - Realtime
  - Auth-integrated row-level access patterns
- Clerk
  - authentication
  - sessions
  - password recovery

### Payments
- Stripe
- `@stripe/stripe-react-native`

### Maps and Location
- OpenStreetMap
- Expo Location
- `react-native-webview`

### Media and Device APIs
- Expo Image Picker
- Expo Image Manipulator
- Expo File System
- Expo Audio / AV
- Expo Notifications

### AI Service
- FastAPI
- Uvicorn
- sentence-transformers
- PyTorch CPU build
- Pillow

## Project Structure
```text
.
├── app.json
├── eas.json
├── package.json
├── src/
│   ├── app/                    # Expo Router screens
│   ├── components/             # UI components
│   ├── constants/              # App constants and static config
│   ├── context/                # React context providers
│   ├── hooks/                  # Custom hooks
│   ├── i18n/                   # Localization setup and locale files
│   ├── lib/                    # Shared app libraries
│   ├── types/                  # TypeScript types
│   └── utils/                  # Helpers and utilities
├── supabase/
│   └── migrations/             # Database migrations and policies
└── tools/
    └── ai_search/              # Python AI service
```

## Prerequisites
Install the following before running the project:

- Node.js 20+ or 22+
- npm
- Android Studio
- Android SDK
- Java 17
- Expo CLI / `npx expo`

For Android local builds, make sure these are configured on Windows:
- `JAVA_HOME`
- `ANDROID_HOME`
- `Path` entries for Java and Android SDK tools

Typical checks:
```powershell
java --version
adb --version
```

## Environment Variables
Create a local `.env` file in the project root.

Required mobile app variables:
```env
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=...
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=...
EXPO_PUBLIC_AI_SEARCH_API_URL=...
```

Notes:
- `EXPO_PUBLIC_AI_SEARCH_API_URL` should point to the hosted AI service if you want AI search and image moderation to work on physical devices or in APK builds.
- Do not put Supabase service-role keys into the mobile app.

## Installation
Install dependencies:
```bash
npm install
```

If you are using the exact project lockfile/build flow, keep `.npmrc` in place so local installs and cloud installs resolve dependencies consistently.

## Running the App Locally
### Start Metro
```bash
npx expo start
```

### Run Android locally
For the fastest development loop:
```bash
npx expo run:android
```

This is the preferred workflow while making UI or logic changes. Use EAS only when you want a final shareable APK.

### Useful local commands
```bash
npx tsc --noEmit --pretty false
npx eslint src --ext .ts,.tsx
npx expo-doctor
```

## AI Service
The AI service lives in:
- [`tools/ai_search`](./tools/ai_search)

It provides:
- `GET /health`
- `GET /semantic-search`
- `GET /recommendations`
- `POST /moderate-image`

### Local AI service setup
Install Python dependencies in the AI service environment, then run:
```bash
bash tools/ai_search/start_local_ai.sh
```

Default local behavior:
- Android emulator can use `10.0.2.2`
- iOS simulator can use `localhost`
- physical devices should use a hosted URL instead

### AI service environment
The AI service needs:
```env
EXPO_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

### Railway deployment
Recommended Railway configuration:
- Root Directory: `tools/ai_search`
- Builder: `Railpack`
- Runtime: Python 3.11 via `runtime.txt`
- Start command:
```bash
uvicorn api_server:app --host 0.0.0.0 --port $PORT
```

After deployment:
1. generate a public Railway domain
2. confirm:
   - `/health`
3. set:
```env
EXPO_PUBLIC_AI_SEARCH_API_URL=https://YOUR-SERVICE.up.railway.app
```

## Supabase
This project depends on Supabase for:
- product and trade data
- conversations and messages
- notifications
- storage buckets
- subscription state
- moderation-related data integration

### Apply migrations
If you are running Supabase locally or managing schema updates from this repo:
```bash
npx supabase db push
```

Examples of schema-driven features in this repo:
- chat media bucket
- notifications policies
- storage policies
- marketplace and trade tables

## Android APK Build
### Local Android development build
```bash
npx expo run:android
```

### EAS preview APK
This project is configured so the `preview` profile builds an installable APK:
```bash
eas build -p android --profile preview
```

`eas.json` currently uses:
- `preview.distribution = internal`
- `preview.android.buildType = apk`

### EAS environment variables
If building with EAS, add the app env vars to the matching EAS environment:
- `preview`
- `production`

At minimum:
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `EXPO_PUBLIC_AI_SEARCH_API_URL`

## Scripts
From `package.json`:

```bash
npm run start
npm run android
npm run ios
npm run web
npm run lint
```

## Important Notes
### Image moderation
- Listing image moderation depends on the AI service
- If the AI service is unavailable or under memory pressure, moderation behavior depends on the current app-side fallback logic
- Dangerous text moderation is separate from image moderation

### Maps
- The app uses OpenStreetMap-based flows instead of requiring Google Maps SDK setup for Android
- This is intentional for APK-friendly operation without Google Maps API key configuration

### Stripe
- Stripe is integrated in test/development mode unless production credentials and backend behavior are configured

### Real-device testing
Before final APK generation, test on a physical Android device:
- keyboard behavior in regular chat and trade chat
- image upload
- location sharing
- create/edit listing
- trade offer flow
- notifications
- AI search

## Known Constraints
- The AI image moderation endpoint is heavier than the semantic-search endpoint and may need more reliable hosting resources for full production-grade behavior
- Some lint warnings remain in the codebase, but TypeScript compilation and lint errors should be cleared before release
- A few integrations depend on environment configuration rather than app code alone:
  - Stripe
  - hosted AI service
  - Supabase project credentials

## License
This project is proprietary and all rights are reserved. See [LICENSE](./LICENSE).
