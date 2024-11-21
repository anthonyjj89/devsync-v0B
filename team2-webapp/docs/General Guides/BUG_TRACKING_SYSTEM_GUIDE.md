# Bug Tracking System Implementation Guide

## Overview
This guide details how to implement a full-stack bug tracking system using Next.js, MongoDB, and screenshot functionality. The system includes a user interface for bug reporting, database integration, and markdown file synchronization.

## System Components

### 1. Database Setup (MongoDB)
```typescript
// src/lib/schemas/bug.ts
interface Bug {
  id: string;
  title: string;
  status: 'Open' | 'Closed';
  priority: 'Low' | 'Medium' | 'High';
  reportedBy: string;
  steps: string[];
  createdAt: Date;
  updatedAt: Date;
  screenshot?: {
    path: string;  // TODO: Update to use cloud storage
    timestamp: Date;
  };
}
```

#### Collection Initialization
```typescript
// src/app/api/db/init/route.ts
await db.createCollection('bugs', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['id', 'title', 'status', 'priority', 'reportedBy', 'steps', 'createdAt', 'updatedAt'],
      properties: {
        // ... schema properties
      }
    }
  }
});

// Create indexes
await db.collection('bugs').createIndex({ id: 1 }, { unique: true });
await db.collection('bugs').createIndex({ status: 1 });
await db.collection('bugs').createIndex({ priority: 1 });
```

### 2. API Endpoints

#### Bug Management
```typescript
// src/app/api/sync/bugs/route.ts
export async function POST(request: NextRequest) {
  // Add new bug
  const bug = await collection.insertOne({
    id: `BUG-${Date.now()}`,
    status: 'Open',
    // ... other fields
  });
}

export async function GET(request: NextRequest) {
  // Fetch and sync bugs with markdown
  const bugs = await collection.find().toArray();
  await syncWithMarkdown(bugs);
}
```

#### Screenshot Handling
```typescript
// src/app/api/screenshots/route.ts
export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get('screenshot') as File;
  
  // TODO: Replace with cloud storage
  const filename = `screenshot-${Date.now()}.png`;
  await saveToStorage(file, filename);
  
  return { path: `/screenshots/${filename}` };
}
```

### 3. User Interface Components

#### Bug Report Form
```typescript
// src/components/BugReportForm.tsx
export default function BugReportForm() {
  const [screenshot, setScreenshot] = useState(null);

  async function handleScreenshot() {
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: { displaySurface: 'browser' }
    });
    // Capture and process screenshot
  }

  async function handleSubmit() {
    await fetch('/api/sync/bugs', {
      method: 'POST',
      body: JSON.stringify({
        title,
        priority,
        steps,
        screenshot
      })
    });
  }
}
```

#### Admin Panel
```typescript
// src/components/AdminPanel.tsx
export default function AdminPanel() {
  const [bugs, setBugs] = useState([]);
  
  async function fetchBugs() {
    const response = await fetch('/api/sync/bugs');
    setBugs(await response.json());
  }
  
  // Render bug list and management interface
}
```

### 4. Markdown Sync
```typescript
function formatBugsToMarkdown(bugs: Bug[]): string {
  let content = '# Bug Tracker\n\n';
  
  // Format open bugs
  content += '## Open Bugs\n\n';
  bugs.filter(bug => bug.status === 'Open')
      .forEach(bug => {
        content += formatBugToMarkdown(bug);
      });
  
  // Format closed bugs
  content += '\n## Closed Bugs\n\n';
  // ...
}
```

## TODO: Cloud Storage Integration

Replace local screenshot storage with cloud storage:

1. Set up cloud storage (e.g., AWS S3, Cloudinary)
```typescript
// Future implementation
interface CloudStorage {
  uploadFile(file: File): Promise<string>;
  getFileUrl(path: string): string;
  deleteFile(path: string): Promise<void>;
}
```

2. Update schema
```typescript
interface Bug {
  screenshot?: {
    url: string;      // Cloud storage URL
    storageKey: string; // Unique identifier in storage
    timestamp: Date;
  };
}
```

3. Modify screenshot API
```typescript
export async function POST(request: NextRequest) {
  const file = request.file;
  const result = await cloudStorage.uploadFile(file);
  return {
    url: result.url,
    storageKey: result.key
  };
}
```

## Implementation Steps

1. Database Setup
   ```bash
   # Initialize database with schema
   curl -X POST http://localhost:3000/api/db/init
   ```

2. Add Components
   - Create BugReportForm component
   - Add AdminPanel component
   - Implement screenshot capture

3. Configure API Routes
   - Set up bug management endpoints
   - Implement screenshot handling
   - Create status endpoints

4. Testing
   ```bash
   # Test bug creation
   curl -X POST http://localhost:3000/api/sync/bugs -d '{...}'
   
   # Test screenshot upload
   curl -X POST http://localhost:3000/api/screenshots -F 'file=@screenshot.png'
   ```

## Best Practices

1. Error Handling
   - Validate all inputs
   - Provide meaningful error messages
   - Handle network failures gracefully

2. Performance
   - Optimize image sizes
   - Use proper indexes
   - Implement caching where appropriate

3. Security
   - Validate file types
   - Limit file sizes
   - Sanitize user inputs

4. Maintenance
   - Regular database backups
   - Monitor storage usage
   - Clean up unused screenshots

## Future Enhancements

1. Cloud Storage Migration
   - Set up cloud provider
   - Migrate existing files
   - Update references

2. Authentication
   - User management
   - Role-based access
   - Audit logging

3. Advanced Features
   - Bug templates
   - Custom fields
   - Reporting tools
