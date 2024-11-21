# MongoDB Setup Guide for Next.js Projects

## 1. MongoDB Atlas Setup

1. Create MongoDB Atlas Account
   - Visit [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
   - Sign up or log in
   - Create a new project

2. Create Database
   - Click "Build a Database"
   - Choose "FREE" tier
   - Select region (e.g., AWS Frankfurt)
   - Name your cluster

3. Security Setup
   - Create database user
     * Username and secure password
     * "Read and write to any database" privileges
   - Network Access
     * Add IP Address: 0.0.0.0/0 (for development)

4. Get Connection String
   - Click "Connect"
   - Choose "Drivers"
   - Copy connection string
   - Replace `<password>` with your actual password

## 2. Project Setup

1. Install Dependencies
```bash
npm install mongodb
```

2. Environment Setup
Create `.env.local`:
```env
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/?retryWrites=true&w=majority&appName=<AppName>
```

3. MongoDB Configuration
Create `src/lib/mongodb.ts`:
```typescript
import { MongoClient, MongoClientOptions } from 'mongodb';

if (!process.env.MONGODB_URI) {
  throw new Error('Please add your Mongo URI to .env.local');
}

const uri = process.env.MONGODB_URI;
const options: MongoClientOptions = {
  maxPoolSize: 10,
  minPoolSize: 5,
  retryWrites: true,
  connectTimeoutMS: 10000,
  socketTimeoutMS: 45000,
};

declare global {
  var _mongoClientPromise: Promise<MongoClient>;
}

let clientPromise: Promise<MongoClient>;

async function connectToDatabase(): Promise<MongoClient> {
  try {
    const client = new MongoClient(uri, options);
    console.log('Attempting to connect to MongoDB...');
    const connectedClient = await client.connect();
    console.log('Successfully connected to MongoDB');
    return connectedClient;
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    throw error;
  }
}

if (process.env.NODE_ENV === 'development') {
  if (!global._mongoClientPromise) {
    global._mongoClientPromise = connectToDatabase();
  }
  clientPromise = global._mongoClientPromise;
} else {
  clientPromise = connectToDatabase();
}

export default clientPromise;

// Helper functions
export async function getDb(dbName = 'your-db-name') {
  const client = await clientPromise;
  return client.db(dbName);
}

export async function getCollection(collectionName: string, dbName = 'your-db-name') {
  const db = await getDb(dbName);
  return db.collection(collectionName);
}

export async function checkConnection() {
  try {
    const client = await clientPromise;
    const result = await client.db().admin().ping();
    return result.ok === 1;
  } catch (error) {
    console.error('Database connection check failed:', error);
    return false;
  }
}
```

4. Test Connection Endpoint
Create `src/app/api/test-db/route.ts`:
```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { checkConnection, getDb } from '@/lib/mongodb';

export async function GET(request: NextRequest) {
  try {
    const isConnected = await checkConnection();
    const db = await getDb();
    const collections = await db.listCollections().toArray();

    return NextResponse.json({
      status: 'success',
      data: {
        isConnected,
        collections: collections.map(col => col.name)
      }
    });
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
```

## 3. Usage Examples

1. Create Document
```typescript
const collection = await getCollection('your-collection');
await collection.insertOne({ 
  field: 'value',
  createdAt: new Date()
});
```

2. Query Documents
```typescript
const collection = await getCollection('your-collection');
const documents = await collection.find({}).toArray();
```

3. Update Document
```typescript
const collection = await getCollection('your-collection');
await collection.updateOne(
  { _id: documentId },
  { $set: { field: 'new value' }}
);
```

## 4. Best Practices

1. Error Handling
- Always use try-catch blocks
- Log errors appropriately
- Return meaningful error messages

2. Connection Management
- Use connection pooling
- Implement reconnection logic
- Monitor connection status

3. Security
- Never commit .env files
- Use environment variables
- Implement proper access controls

4. Performance
- Create indexes for frequent queries
- Monitor query performance
- Implement caching when needed

## 5. Troubleshooting

1. Connection Issues
- Verify MongoDB URI format
- Check network access settings
- Confirm credentials are correct

2. Performance Issues
- Monitor connection pool size
- Check query patterns
- Review indexes

3. Common Errors
- Authentication failed: Check credentials
- Connection timeout: Check network/firewall
- Invalid URI: Verify connection string format

## 6. Admin Panel Integration

Add a status panel to monitor database connection:

1. Create Status API (`src/app/api/status/route.ts`):
```typescript
import { NextResponse } from 'next/server';
import { checkConnection } from '@/lib/mongodb';

export async function GET() {
  try {
    const isConnected = await checkConnection();
    
    return NextResponse.json({
      status: 'success',
      data: {
        database: {
          connected: isConnected,
          name: 'MongoDB Atlas'
        }
      }
    });
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      data: {
        database: {
          connected: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    }, { status: 500 });
  }
}
```

2. Create AdminPanel component (`src/components/AdminPanel.tsx`):
```typescript
'use client';

import { useState, useEffect } from 'react';

export default function AdminPanel() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  async function checkStatus() {
    try {
      const response = await fetch('/api/status');
      const data = await response.json();
      setStatus(data.data);
    } catch (error) {
      console.error('Failed to check status:', error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    checkStatus();
  }, []);

  return (
    <div className="fixed bottom-4 right-4 bg-white p-4 rounded-lg shadow">
      <h2>System Status</h2>
      {loading ? (
        <div>Loading...</div>
      ) : (
        <div>
          Database: {status?.database?.connected ? '✅' : '❌'}
        </div>
      )}
    </div>
  );
}
```

## 7. Testing

1. Database Connection
```bash
curl http://localhost:3000/api/test-db
```

2. Status Check
```bash
curl http://localhost:3000/api/status
```

3. Expected Response
```json
{
  "status": "success",
  "data": {
    "isConnected": true,
    "collections": ["your-collections"]
  }
}
