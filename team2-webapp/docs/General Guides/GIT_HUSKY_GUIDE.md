# Git Workflow with Husky Integration Guide

## What is Husky?

Husky is a tool that makes Git hooks easy. Git hooks are scripts that run automatically when certain Git events happen. Think of Husky as a friendly guard dog that checks your code before letting you commit changes.

### In Simple Terms
- Without Husky: You commit code → Code goes straight to repository
- With Husky: You commit code → Husky runs checks → If checks pass → Code goes to repository

## Setting Up Husky

### 1. Installation
```bash
# Install Husky
npm install husky --save-dev

# Enable Git hooks
npx husky install

# Add prepare script to package.json
npm pkg set scripts.prepare="husky install"
```

### 2. Adding Hooks
```bash
# Add a pre-commit hook
npx husky add .husky/pre-commit "npm run lint"
```

## Common Use Cases

### 1. Code Quality Checks
```bash
# .husky/pre-commit
#!/bin/sh
npm run lint
npm run test
```

### 2. Format Check
```bash
# .husky/pre-commit
#!/bin/sh
npm run format-check
```

### 3. Custom Scripts
```bash
# .husky/pre-commit
#!/bin/sh
npm run sync:bugs  # Sync bug database with markdown
```

## Our Project Setup

### 1. Bug Tracker Sync
```bash
# package.json
{
  "scripts": {
    "sync:bugs": "curl -X GET http://localhost:3000/api/sync/bugs"
  }
}

# .husky/pre-commit
#!/bin/sh
npm run sync:bugs
```

This ensures our BUG_TRACKER.md is always up-to-date when committing changes.

## Git Workflow with Husky

### 1. Normal Git Flow
```bash
# Without Husky
git add .
git commit -m "feat: add new feature"
git push
```

### 2. Git Flow with Husky
```bash
# With Husky
git add .
git commit -m "feat: add new feature"
# Husky automatically:
# 1. Runs pre-commit hooks
# 2. Syncs bug database
# 3. Only commits if everything passes
git push
```

## Branch Strategy

### 1. Main Branches
- `main`: Production-ready code
- `dev`: Development branch

### 2. Feature Branches
```bash
# Create feature branch
git checkout -b feature/new-feature

# Work on feature
git add .
git commit -m "feat: add new feature"
# Husky runs checks

# Push feature
git push origin feature/new-feature
```

## Common Husky Hooks

### 1. pre-commit
Runs before commits are created:
- Lint code
- Run tests
- Format code
- Sync documentation

### 2. pre-push
Runs before pushing to remote:
- Run full test suite
- Build project
- Check dependencies

### 3. commit-msg
Validates commit messages:
- Check format
- Enforce conventions
- Validate ticket numbers

## Best Practices

### 1. Keep Hooks Fast
```bash
# Good - Quick checks
npm run lint

# Bad - Long-running tests
npm run full-test-suite
```

### 2. Clear Error Messages
```bash
# .husky/pre-commit
#!/bin/sh
if ! npm run lint; then
  echo "❌ Linting failed. Please fix errors before committing."
  exit 1
fi
```

### 3. Skip Hooks (Emergency Only)
```bash
# Skip all hooks
git commit -m "feat: urgent fix" --no-verify

# Not recommended for normal use!
```

## Troubleshooting

### 1. Hook Not Running
```bash
# Check Husky installation
npm run prepare

# Verify hook permissions
chmod +x .husky/pre-commit
```

### 2. Hook Failing
```bash
# Run hook manually
.husky/pre-commit

# Check script in package.json
npm run sync:bugs
```

## Tips for Teams

### 1. Document Hooks
```markdown
# Hooks Documentation
- pre-commit: Runs linting and syncs bug database
- pre-push: Runs full test suite
```

### 2. Consistent Setup
```bash
# Add to README.md
## Development Setup
1. npm install
2. npm run prepare  # Sets up Husky
```

### 3. Share Best Practices
```markdown
# Git Commit Guidelines
- Use conventional commits
- Keep changes focused
- Write clear messages
```

## Why Use Husky?

### Benefits
1. Automated Quality Control
   - Catches issues early
   - Maintains consistency
   - Reduces human error

2. Team Collaboration
   - Enforces standards
   - Keeps documentation updated
   - Prevents bad commits

3. Time Saving
   - Automates routine tasks
   - Prevents future issues
   - Maintains project health

## Remember
- Husky is a helper, not a hindrance
- Hooks should be fast and reliable
- Document any custom hooks
- Keep the team informed of changes
