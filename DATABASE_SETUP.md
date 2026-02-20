# Database Setup Guide

This project uses Prisma with SQLite for the database. Follow these steps to set up the database:

## Prerequisites

- Node.js/Bun installed
- Prisma CLI (installed via dependencies)

## Setup Steps

### 1. Environment Variables

A `.env` file has been created with:
```
DATABASE_URL="file:./dev.db"
```

For production, you can change this to use PostgreSQL, MySQL, or another database by updating the `DATABASE_URL` and the `provider` in `prisma/schema.prisma`.

### 2. Generate Prisma Client

Run this command to generate the Prisma Client based on your schema:

```bash
bun run db:generate
# or
npx prisma generate
```

### 3. Create Database and Tables

Push the schema to create the database and tables:

```bash
bun run db:push
# or
npx prisma db push
```

This will create a `dev.db` file in your project root (for SQLite) with all the tables.

### 4. Verify Connection

You can test the database connection by:

1. **Via API endpoint**: Visit `http://localhost:3000/api/db/test` after starting your dev server
2. **Via Prisma Studio**: Run `npx prisma studio` to open a visual database browser

## Database Schema

The database includes the following models:

- **Transcription**: Stores voice transcriptions
- **EnhancedPrompt**: Stores AI-enhanced prompts created from transcriptions
- **SuggestedFollowUp**: Stores suggested follow-up prompts for enhanced prompts

## Available Database Functions

All database operations are available in `src/lib/db-utils.ts`:

- `createTranscription()` - Create a new transcription
- `getTranscription()` - Get a transcription by ID
- `getAllTranscriptions()` - Get all transcriptions (with pagination)
- `updateTranscription()` - Update a transcription
- `deleteTranscription()` - Delete a transcription
- `createEnhancedPrompt()` - Create an enhanced prompt
- `getEnhancedPrompt()` - Get an enhanced prompt by ID
- `getEnhancedPromptsByTranscription()` - Get all enhanced prompts for a transcription
- `checkDatabaseConnection()` - Test database connection
- `getTranscriptionStats()` - Get statistics about transcriptions

## Migration Commands

```bash
# Generate Prisma Client
bun run db:generate

# Push schema changes (development)
bun run db:push

# Create a migration (production)
bun run db:migrate

# Reset database (WARNING: deletes all data)
bun run db:reset
```

## Using the Database in Your Code

```typescript
import { createTranscription, getAllTranscriptions } from '@/lib/db-utils'

// Create a transcription
const transcription = await createTranscription({
  transcription: "Hello world",
  wordCount: 2,
  fileName: "recording.webm",
  fileSize: 1024,
  type: "recording"
})

// Get all transcriptions
const transcriptions = await getAllTranscriptions(20)
```

## Troubleshooting

If you encounter issues:

1. **"Prisma Client not generated"**: Run `bun run db:generate`
2. **"Database file not found"**: Run `bun run db:push` to create it
3. **"Connection failed"**: Check your `DATABASE_URL` in `.env`
4. **Schema changes not reflected**: Run `bun run db:push` again
