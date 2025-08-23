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
# Development server
npm run dev

# Or open directly in browser
open index.html
```

### Testing
```bash
# Run all tests
npm test

# Run tests with browser visible
npm run test:headed

# Debug specific test
npm run test:debug
```

### Version Management and Deployment

**IMPORTANT**: Always update version numbers before deploying to ensure proper cache invalidation for both browser and PWA users.

#### Version Update Commands
```bash
# Update patch version (1.0.8 -> 1.0.9) - for bug fixes
npm run version:patch

# Update minor version (1.0.8 -> 1.1.0) - for new features  
npm run version:minor

# Update major version (1.0.8 -> 2.0.0) - for breaking changes
npm run version:major

# Automated release (update version + commit + push)
npm run release
```

#### Deployment to Cloudflare Pages
```bash
# Step 1: Update version (REQUIRED before each deployment)
npm run version:patch  # or minor/major as appropriate

# Step 2: Build and deploy
npm run deploy
```

#### Cache Management
The project includes sophisticated cache management for both browser and PWA users:

- **Browser users**: Query parameters (`?v=1.0.8`) force cache refresh
- **PWA users**: Service Worker cache names sync with version numbers
- **Auto-update**: Users see update notifications when new versions are available
- **Version files**: All version numbers are automatically synchronized across:
  - `index.html` (CSS/JS query params, display version)
  - `sw.js` (cache name)
  - `version-update.js` (update checker)

#### Deployment Checklist
1. ✅ Test all changes locally
2. ✅ Update version number (`npm run version:patch`)
3. ✅ Commit version changes
4. ✅ Deploy to Cloudflare (`npm run deploy`)
5. ✅ Verify PWA users receive update notifications

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

### Image Handling
- **Local Upload**: All images uploaded from user's device (no URL input)
- **Automatic Compression**: Images compressed to max 800x800px, 80% quality
- **Base64 Storage**: Compressed images stored as Base64 in IndexedDB
- **Size Limits**: Maximum 5MB per image file
- **Format Support**: All standard image formats (JPG, PNG, GIF, etc.)

### PWA and Caching Strategy
- **Service Worker**: `sw.js` handles offline caching and updates
- **Update Detection**: Automatic version checking every 30 seconds
- **User Notifications**: Friendly update prompts for new versions
- **Cache Invalidation**: Version-based cache names ensure fresh content
- **Offline Support**: Core functionality works without internet connection

## Code Conventions

- Use Alpine.js directive syntax (`x-data`, `x-show`, `x-model`)
- CSS variables defined in `:root` for theming
- Async/await for database operations
- Chinese UI text for user-facing elements
- Timestamp-based IDs for database records

## Custom Slash Commands

### Creating Project Commands
Commands specific to this project should be placed in `.claude/commands/` directory:

```bash
# Create project command directory
mkdir -p .claude/commands

# Create a custom command (example: code optimization)
echo "Analyze this code for performance issues and suggest optimizations:" > .claude/commands/optimize.md
```

### Command Features
- **Arguments**: Use `$ARGUMENTS` placeholder in command content
- **File references**: Use `@filename` to reference specific files  
- **Bash execution**: Prefix commands with `!` to run bash commands
- **Namespacing**: Use subdirectories for organization

### Command Configuration
Add frontmatter to `.md` files for advanced options:
```markdown
---
description: "Brief command description"
argument-hint: "Expected argument format"
allowed-tools: ["Read", "Edit", "Bash"]
model: "claude-3-5-sonnet-20241022"
---
Command content here with $ARGUMENTS placeholder
```

### Personal Commands
For commands across all projects, use `~/.claude/commands/` directory.