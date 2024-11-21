# Project Handover Documentation

## Latest Session Update (2024-01-19)

### Session Achievements
1. Implemented comprehensive debug system with structured logging
2. Split AI settings for Kodu and Cline
3. Enhanced message processing with role detection
4. Improved file watching system

### Active Issues
- [BUG-HP-001] Memory leak in file watching system
- [BUG-HP-002] Message role detection issues
- [FEAT-HP-001] Message search functionality needed
- [FEAT-HP-002] Dark mode implementation in progress

### Next Steps
1. Investigate and fix memory leak
2. Improve message role detection
3. Implement search functionality
4. Complete dark mode implementation

## Quick Start

### Environment Setup
1. Install required software:
   - Node.js version 18.0.0+
   - npm or yarn

2. Clone and setup:
```bash
# Clone repository
git clone [repository-url]
cd team2-webapp

# Install dependencies
npm install

# Start development server
npm run dev

# Start backend server (in separate terminal)
node server.js
```

3. Configure paths:
   - Set Kodu AI path in settings
   - Set Cline AI path in settings
   - Configure project path for file watching

## Critical Components

### Message Processing System
- Location: `src/utils/messageProcessor.js`
- Purpose: Handles message parsing, role detection, and formatting
- Dependencies: debug.js
- Current issues: Role detection improvements needed

### File Watcher
- Location: `src/services/fileWatcher.js`
- Purpose: Real-time file monitoring and synchronization
- Dependencies: Socket.IO, debug.js
- Current issues: Memory leak investigation

### Debug System
- Location: `src/utils/debug.js`
- Purpose: Comprehensive logging and debugging
- Dependencies: None
- Current issues: None (recently implemented)

## Important Services

### FileWatcher Service
```javascript
// Location: src/services/fileWatcher.js
class FileWatcher {
  constructor(onUpdate) {
    // Handles file watching and updates
  }
  
  async start() {
    // Initializes file watching
  }
}
```

### MessageProcessor
```javascript
// Location: src/utils/messageProcessor.js
export const processMessageContent = (message, advancedMode = false) => {
  // Processes and formats messages
};
```

## Common Tasks

### Development Workflow
1. Starting development:
   - Start development server: `npm run dev`
   - Start backend server: `node server.js`
   - Configure AI paths in settings
   - Enable debug panel if needed

2. Ending development session:
   - Document changes in CODE_JOURNAL.md
   - Update CURRENT_TASKS.md
   - Stop all running servers
   - Commit changes with clear messages

### Bug Reporting
1. Check BUG_DATABASE.md format
2. Add bug with required information
3. Update BUGS_AND_FEATURES.md
4. Assign priority and owner

## Known Issues

### Current Limitations
1. Memory usage in file watching system
2. Message role detection accuracy
3. No search functionality
4. Limited theme support

### Workarounds
1. Restart application if memory usage is high
2. Manually verify message roles in advanced mode
3. Use browser search for message finding
4. Use browser dark mode for now

## Security Considerations

### File Access
- Only access specified directories
- Validate all paths
- Handle file permissions properly

### Data Storage
- File-based storage system
- Local file system only
- Regular Git backups

## Testing

### Manual Testing
1. Test file watching functionality
2. Verify message processing
3. Check AI integration
4. Validate settings persistence

### Development Testing
```bash
# Start development server
npm run dev

# Run linting
npm run lint
```

## Deployment

### Development
```bash
# Build command
npm run build

# Start development server
npm run dev

# Start backend server
node server.js
```

## Monitoring

### Error Tracking
- Debug panel in application
- Console logging
- File operation logging
- WebSocket connection monitoring

### Performance
- Memory usage monitoring
- File watching performance
- Message processing speed
- UI responsiveness

## Code Standards

### Style Guide
- Use ESLint configuration
- Follow React best practices
- Maintain consistent file structure
- Document complex logic

### Best Practices
- Use debug logging for important operations
- Handle errors appropriately
- Follow component organization
- Keep services modular

### File Organization
- Components in appropriate directories
- Services in services directory
- Utilities in utils directory
- Documentation in docs directory

### Documentation
- Update memlog files for improvements
- Maintain clear code comments
- Keep documentation current
- Document all major changes
