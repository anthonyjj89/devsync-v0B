# DevSync Web Application

A React-based web application for managing AI development interactions and file synchronization between Kodu and Cline AI assistants.

## Features

- 🤖 Dual AI Support (Kodu & Cline)
- 📁 Real-time File Watching
- 💬 Message Processing & Display
- 🔄 File History Tracking
- 🐛 Debug Panel & Logging
- ⚙️ Configurable Settings

## Quick Start

### Prerequisites
- Node.js (v18+)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone [repository-url]
cd team2-webapp
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Start the backend server:
```bash
node server.js
```

The application will be available at `http://localhost:5173`

## Architecture

### Frontend
- React 18.2.0
- Vite for build tooling
- TailwindCSS for styling
- Socket.IO client for real-time updates

### Backend
- Express server
- Socket.IO for WebSocket support
- Chokidar for file watching
- File-based storage system

## Core Components

### Message Processing
- Role-based message filtering
- Advanced/Basic mode support
- Real-time message updates
- Message grouping and threading

### File Management
- Real-time file watching
- File history tracking
- Version management
- File explorer interface

### Debug System
- Comprehensive logging
- Performance monitoring
- Error tracking
- Debug panel interface

## Configuration

### AI Settings
```javascript
{
  "koduPath": "path/to/kodu/tasks",
  "clinePath": "path/to/cline/tasks",
  "selectedTaskFolder": "folder_name",
  "enabledAIs": {
    "kodu": true,
    "cline": true
  }
}
```

### File Watching
- Supports multiple file types
- Real-time change detection
- Automatic reconnection
- Error recovery

## Development

### Available Scripts

- `npm run dev`: Start development server
- `npm run build`: Build for production
- `npm run preview`: Preview production build
- `npm run lint`: Run ESLint

### Project Structure
```
team2-webapp/
├── docs/           # Documentation
├── memlog/         # Implementation tracking
├── public/         # Static assets
└── src/           # Source code
    ├── components/ # React components
    ├── services/   # Core services
    └── utils/      # Utility functions
```

## Documentation

- [Project Structure](docs/PROJECT_TREE.md)
- [Code Journal](docs/CODE_JOURNAL.md)
- [Current Tasks](docs/CURRENT_TASKS.md)
- [Bug Database](docs/BUG_DATABASE.md)
- [Features & Bugs](docs/BUGS_AND_FEATURES.md)

## Contributing

1. Check current tasks in [CURRENT_TASKS.md](docs/CURRENT_TASKS.md)
2. Follow code style and organization in [PROJECT_TREE.md](docs/PROJECT_TREE.md)
3. Document changes in [CODE_JOURNAL.md](docs/CODE_JOURNAL.md)
4. Test thoroughly before submitting changes

## License

[License Type] - see LICENSE file for details
