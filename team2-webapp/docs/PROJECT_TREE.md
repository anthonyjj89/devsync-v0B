# Project Directory Structure

## Overview
This document outlines the project's directory structure and explains the purpose of each major directory and file.

## Directory Tree
```
[project-name]/
├── src/                      # Source code
│   ├── components/           # React/UI components
│   │   ├── common/          # Reusable components
│   │   ├── features/        # Feature-specific components
│   │   └── layouts/         # Layout components
│   ├── services/            # External service integrations
│   ├── hooks/               # Custom React hooks
│   ├── utils/               # Utility functions
│   ├── types/               # TypeScript type definitions
│   ├── styles/              # Global styles and themes
│   ├── contexts/            # React contexts
│   └── tests/               # Test files
├── public/                   # Static assets
├── docs/                     # Documentation
├── scripts/                  # Build/deployment scripts
└── config/                   # Configuration files
```

## Directory Descriptions

### `/src`
Main source code directory containing all application code.

#### `/src/components`
React components organized by function:
- `/common`: Reusable UI components (buttons, inputs, cards)
- `/features`: Feature-specific components
- `/layouts`: Page layouts and structural components

#### `/src/services`
External service integrations:
- API clients
- Third-party service wrappers
- Data fetching utilities

#### `/src/hooks`
Custom React hooks:
- Data fetching hooks
- State management hooks
- Utility hooks

#### `/src/utils`
Utility functions and helpers:
- Data formatting
- Calculations
- Common operations

#### `/src/types`
TypeScript type definitions:
- Interface definitions
- Type aliases
- Enums

#### `/src/styles`
Styling-related files:
- Global styles
- Theme definitions
- Style utilities

#### `/src/contexts`
React context definitions:
- State management contexts
- Theme contexts
- Feature-specific contexts

#### `/src/tests`
Test files:
- Unit tests
- Integration tests
- Test utilities

### `/public`
Static assets:
- Images
- Fonts
- Global static files

### `/docs`
Project documentation:
- Setup guides
- API documentation
- Architecture diagrams

### `/scripts`
Build and deployment scripts:
- Build configurations
- Deployment automations
- Development utilities

### `/config`
Configuration files:
- Environment configs
- Build settings
- Tool configurations

## Naming Conventions

### Components
- PascalCase for component files: `Button.tsx`, `UserProfile.tsx`
- Corresponding styles: `Button.styles.ts`, `UserProfile.styles.ts`
- Tests: `Button.test.tsx`, `UserProfile.test.tsx`

### Utilities
- camelCase for utility files: `formatDate.ts`, `calculateTotal.ts`
- Tests: `formatDate.test.ts`, `calculateTotal.test.ts`

### Hooks
- Prefix with 'use': `useAuth.ts`, `useDataFetching.ts`
- Tests: `useAuth.test.ts`, `useDataFetching.test.ts`

### Contexts
- Suffix with 'Context': `ThemeContext.ts`, `AuthContext.ts`
- Tests: `ThemeContext.test.ts`, `AuthContext.test.ts`

## Import Organization

### Import Order
1. External libraries
2. Internal modules
3. Components
4. Hooks
5. Utils
6. Types
7. Styles

Example:
```typescript
// External libraries
import React from 'react';
import { useState } from 'react';

// Internal modules
import { API } from '@/services/api';

// Components
import { Button } from '@/components/common';

// Hooks
import { useAuth } from '@/hooks/useAuth';

// Utils
import { formatDate } from '@/utils/formatDate';

// Types
import { UserType } from '@/types';

// Styles
import { StyledContainer } from './styles';
```

## Best Practices

### File Organization
- Keep related files together
- Use index files for cleaner imports
- Maintain consistent directory structure
- Document significant deviations

### Code Organization
- Group related functionality
- Use clear, descriptive names
- Follow established patterns
- Keep files focused and manageable

### Testing Organization
- Mirror source structure in tests
- Keep test files close to source
- Use consistent naming patterns
- Maintain test documentation
