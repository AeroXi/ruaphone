# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

RuaPhone is a lightweight AI chat simulator with a mobile phone interface, built entirely with vanilla web technologies. It simulates a phone OS with apps for AI chat, world-building, presets management, and API configuration.

## Technology Stack

- **Alpine.js** (v3.x): Reactive JavaScript framework for UI state management
- **Dexie.js**: IndexedDB wrapper for local data persistence
- **Axios**: HTTP client for API requests
- **Font Awesome**: Icon library
- **No build tools**: Direct HTML/CSS/JS approach

## Architecture

### Core Components
- `index.html`: Main structure with Alpine.js templates and phone UI layout
- `script.js`: Alpine.js stores, app logic, and database management
- `styles.css`: Complete CSS styling with CSS variables and responsive design

### Data Management
- **Database**: Dexie.js manages IndexedDB with tables for chats, messages, apiConfig, worldBooks, and personas
- **State**: Alpine.js stores handle global state (app, chat, settings, worldBook, personas)
- **Navigation**: Page-based routing using Alpine.js reactive properties

### Key Alpine.js Stores
- `Alpine.store('app')`: UI state, navigation, loading states
- `Alpine.store('chat')`: Chat management, message handling, AI responses
- `Alpine.store('settings')`: API configuration persistence
- `Alpine.store('worldBook')` & `Alpine.store('personas')`: Content management

## Development Workflow

### Running the Application
```bash
# No build step required - open directly in browser
open index.html
```

### Testing
- Manual testing in browser
- No automated test framework configured

### API Integration
- Uses OpenAI-compatible API endpoints
- Configuration stored in IndexedDB
- Endpoint: `${baseURL}/v1/chat/completions`

## Key Features

### Chat System
- AI conversation with message persistence
- Real-time API integration with error handling
- Message history stored locally

### Phone Simulation
- Realistic mobile interface with status bar, battery indicator
- Page-based navigation with smooth transitions
- Touch-friendly responsive design

### Data Persistence
- All user data stored locally in IndexedDB
- No server-side storage or user accounts
- Offline-capable after initial load

## Code Conventions

- Use Alpine.js directive syntax (`x-data`, `x-show`, `x-model`)
- CSS variables defined in `:root` for theming
- Async/await for database operations
- Chinese UI text for user-facing elements
- Timestamp-based IDs for database records