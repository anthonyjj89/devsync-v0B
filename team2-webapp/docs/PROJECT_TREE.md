# Project Structure Documentation

## Directory Overview

### Root Directory
```
team2-webapp/
├── docs/           # Project documentation
├── memlog/         # Implementation tracking and improvements
├── public/         # Static assets
└── src/           # Source code
```

### Source Code Structure
```
src/
├── assets/         # Static assets used in components
├── components/     # React components
│   ├── activity/   # Activity tracking components
│   ├── ai/        # AI-specific components
│   ├── debug/     # Debugging interface
│   ├── file/      # File management components
│   └── views/     # Major view components
├── contexts/      # React contexts
├── hooks/         # Custom React hooks
├── services/      # Core services
│   ├── file/      # File operations
│   ├── path/      # Path validation
│   └── socket/    # WebSocket management
└── utils/         # Utility functions
```

## Key Components

### Core Services
- `fileWatcher.js`: Real-time file monitoring
- `fileHistoryManager.js`: File version management
- `SocketManagement.js`: WebSocket communication
- `PathValidation.js`: Path validation utilities

### React Components
- `App.jsx`: Main application component
- `MessageList.jsx`: Message display
- `FileExplorer.jsx`: File system navigation
- `Settings.jsx`: Application configuration
- `DevManagerDashboard.jsx`: Development management
- `ProjectOwnerDashboard.jsx`: Project overview

### Utility Functions
- `debug.js`: Debugging utilities
- `messageProcessor.js`: Message handling
- `pathUtils.js`: Path manipulation
- `serverDebug.js`: Server-side debugging

## Documentation Structure

### docs/
```
docs/
├── General Guides/           # Development guides
├── Starting Docs/           # Onboarding documentation
├── BUG_DATABASE.md         # Bug tracking
├── CODE_JOURNAL.md         # Code changes
├── DEV_LOG.md             # Development history
├── INDEX.md               # Documentation index
├── PROJECT_TREE.md        # This file
└── README.md              # Project overview
```

### memlog/
```
memlog/
├── debug_improvements.md      # Debugging enhancements
├── message_feed_improvements.md # Message handling updates
├── settings_improvements.md    # Settings updates
└── ui_improvements.md         # UI enhancements
```

## Key Files

### Configuration Files
- `package.json`: Project dependencies
- `vite.config.js`: Vite configuration
- `tailwind.config.js`: Tailwind CSS settings
- `eslint.config.js`: ESLint configuration

### Core Application Files
- `server.js`: Express backend server
- `index.html`: Entry point
- `src/main.jsx`: React entry point
- `src/App.jsx`: Main React component

## Development Guidelines

### Component Organization
- Components should be organized by feature
- Shared components go in the root components directory
- Feature-specific components go in feature subdirectories

### Service Structure
- Core services in services/ directory
- Feature-specific services in feature subdirectories
- Utility functions in utils/ directory

### Documentation
- Keep docs/ up to date with changes
- Update memlog/ with implementation details
- Maintain clear component documentation
- Document all major changes

### Code Style
- Follow ESLint configuration
- Use consistent naming conventions
- Maintain proper file organization
- Follow React best practices

## Future Considerations

### Planned Directories
- `tests/`: Test files
- `scripts/`: Build and utility scripts
- `types/`: TypeScript type definitions
- `constants/`: Shared constants

### Code Organization
- Consider feature-based organization
- Implement proper test structure
- Add proper type definitions
- Improve documentation organization
