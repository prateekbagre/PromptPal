# Z.AI SDK Configuration Guide

The Z.AI SDK requires configuration to work properly. You have two options:

## Option 1: Using .z-ai-config file (Recommended)

1. Edit the `.z-ai-config` file in your project root
2. Replace `YOUR_API_KEY_HERE` with your actual Z.AI API key

```json
{
  "apiKey": "your-actual-api-key-here"
}
```

## Option 2: Using Environment Variable

1. Add your API key to the `.env` file:

```env
ZAI_API_KEY="your-actual-api-key-here"
```

## Getting Your API Key

1. Visit [Z.AI Open Platform](https://z.ai/model-api)
2. Register or Login
3. Go to [API Keys Management](https://z.ai/manage-apikey/apikey-list)
4. Create a new API key or copy an existing one
5. Add it to either `.z-ai-config` or `.env` file

## Important Notes

- The `.z-ai-config` file is already in `.gitignore` so it won't be committed to git
- Never share your API key publicly
- If you're using environment variables, make sure `.env` is also in `.gitignore` (it already is)

## Troubleshooting

If you still get configuration errors:
1. Make sure the `.z-ai-config` file is in the project root (same directory as `package.json`)
2. Check that the JSON format is valid
3. Verify your API key is correct
4. Restart your dev server after making changes
