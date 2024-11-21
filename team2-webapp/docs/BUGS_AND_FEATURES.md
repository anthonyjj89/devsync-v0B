# Bugs and Features Tracking

## Quick Stats
- 🐛 Active Bugs: 2
- ✨ Planned Features: 4
- 🔄 In Progress: 3
- ✅ Completed This Sprint: 2

## Active Bugs

### High Priority

#### [BUG-HP-001] Memory Leak in File Watching System
**Status**: 🔴 Open
**Reported**: 2024-01-19
**Impact**: High
**Description**: Memory usage increases significantly over time when file watching is active
**Steps to Reproduce**:
1. Enable file watching
2. Monitor memory usage over 30+ minutes
3. Observe steady increase in memory consumption
**Assigned**: @performance.team

#### [BUG-HP-002] Message Role Detection Issues
**Status**: 🟡 In Progress
**Reported**: 2024-01-19
**Impact**: High
**Description**: Some messages are incorrectly categorized between user/assistant roles
**Steps to Reproduce**:
1. Send multiple messages in conversation
2. Observe role assignments in message list
3. Note inconsistencies in role detection
**Assigned**: @messaging.team

## Feature Requests

### High Priority

#### [FEAT-HP-001] Message Search and Filtering
**Status**: 📋 Planned
**Requested**: 2024-01-19
**Target Release**: v0.3.0
**Description**: Add ability to search through message history and filter by type/role
**Requirements**:
- [ ] Implement search functionality
- [ ] Add filtering by message type
- [ ] Add filtering by role
- [ ] Add date range filtering
**Dependencies**:
- Message processing system
- UI components for search/filter

#### [FEAT-HP-002] Dark Mode Support
**Status**: 🔄 In Development
**Requested**: 2024-01-19
**Target Release**: v0.3.0
**Description**: Implement dark mode theme support across all components
**Requirements**:
- [ ] Create dark theme color palette
- [ ] Add theme toggle
- [ ] Update all components for theme support
- [ ] Persist theme preference
**Progress**: 60%

### Medium Priority

#### [FEAT-MP-001] Enhanced File History
**Status**: 🚧 Building
**Description**: Improve file history tracking with better version control and diff viewing
**Requirements**:
- [ ] Implement version comparison
- [ ] Add diff viewer
- [ ] Improve history navigation
**Progress**: 40%

### Low Priority

#### [FEAT-LP-001] Keyboard Shortcuts
**Status**: 💡 Under Consideration
**Description**: Add keyboard shortcuts for common operations
**Requirements**:
- [ ] Define shortcut mapping
- [ ] Implement shortcut handler
- [ ] Add shortcut documentation
- [ ] Add shortcut customization

## Recently Completed

### Resolved Bugs

#### [BUG-001] Debug Panel Performance
**Resolved**: 2024-01-19
**Solution**: Implemented log entry limiting and periodic cleanup
**Verified By**: @qa.team

### Implemented Features

#### [FEAT-001] Split AI Settings
**Completed**: 2024-01-19
**Release**: v0.2.0
**Notes**: Separated Kodu and Cline AI settings for better management

## Categorized Issues

### Frontend

#### Bugs
- [BUG-FE-001] Message role display inconsistency
- [BUG-FE-002] Settings panel scroll issues

#### Features
- [FEAT-FE-001] Dark mode support
- [FEAT-FE-002] Enhanced file explorer

### Backend

#### Bugs
- [BUG-BE-001] Memory leak in file watcher
- [BUG-BE-002] WebSocket reconnection issues

#### Features
- [FEAT-BE-001] Improved file history tracking
- [FEAT-BE-002] Better error handling

### Performance

#### Bugs
- [BUG-PERF-001] Memory usage optimization
- [BUG-PERF-002] Message processing speed

#### Features
- [FEAT-PERF-001] Message caching improvements
- [FEAT-PERF-002] File watching optimization

## Priority Guidelines

### Bug Priority Criteria
- **High**: System-breaking, affects many users
- **Medium**: Functional issue, workaround exists
- **Low**: Minor inconvenience, cosmetic issues

### Feature Priority Criteria
- **High**: Core functionality, immediate business value
- **Medium**: Important but not urgent
- **Low**: Nice to have, future consideration

## Status Definitions

### Bug Statuses
- 🔴 Open: Not yet addressed
- 🟡 In Progress: Being worked on
- 🔧 Fixing: Fix in development
- ✅ Resolved: Fix completed
- 🔄 Verified: Tested and confirmed

### Feature Statuses
- 💡 Proposed: Under consideration
- 📋 Planned: Approved for development
- 🚧 In Development: Being built
- 🔄 Testing: Under QA review
- ✅ Completed: Released
