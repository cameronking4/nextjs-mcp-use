# Headless MCP-use (from Registry) with Next.js

**Uses `@vercel/mcp-adapter` with a configurable MCP registry**

## Deployed URL

This application is deployed at: https://nextjs-mcp-use.vercel.app

## Features

- **MCP Registry**: Configure multiple MCP servers in a single JSON file
- **GitHub Actions**: Test and monitor your API endpoints with scheduled and manual workflows
- **Error Handling**: Graceful handling of timeouts and connection failures
- **Environment Variables**: Configure environment variables for each MCP server

## MCP Registry

The MCP registry is a JSON configuration file that stores information about all available MCP servers. Each server can be enabled or disabled, and can have its own environment variables.

The registry is located at `config/mcp-registry.json` and has the following structure:

```json
{
  "server-name": {
    "url": "http://localhost:3002/sse",
    "enabled": true,
    "env": {
      "API_KEY": "your-api-key"
    }
  },
  "another-server": {
    "url": "https://example.com/sse",
    "enabled": false
  }
}
```

## Usage

This sample app uses the [Vercel MCP Adapter](https://www.npmjs.com/package/@vercel/mcp-adapter) that allows you to drop in an MCP server on a group of routes in any Next.js project.

Update `app/[transport]/route.ts` with your tools, prompts, and resources following the [MCP TypeScript SDK documentation](https://github.com/modelcontextprotocol/typescript-sdk/tree/main?tab=readme-ov-file#server).

### API Endpoints

- **Chat API**: `/api/chat` - Streaming chat endpoint
- **Completions API**: `/api/completions` - Non-streaming chat completions endpoint

### Testing the API

You can test the API endpoints using the provided test script:

```sh
# Test the chat endpoint
npm run test:chat -- --message "Your message here"

# Test the completions endpoint
npm run test:completions -- --message "Your message here"

# Test with a custom URL
npm run test:chat -- --url http://localhost:3000/api/chat --message "Your message here"
```

## GitHub Actions

This project includes GitHub Actions workflows for testing and monitoring the API endpoints. See the [.github/workflows/README.md](.github/workflows/README.md) file for more information.

## Notes for running on Vercel

- To use the SSE transport, requires a Redis attached to the project under `process.env.REDIS_URL`
- Make sure you have [Fluid compute](https://vercel.com/docs/functions/fluid-compute) enabled for efficient execution
- After enabling Fluid compute, open `app/route.ts` and adjust `maxDuration` to 800 if you using a Vercel Pro or Enterprise account
- [Deploy the Next.js MCP template](https://vercel.com/templates/next.js/model-context-protocol-mcp-with-next-js)

## Sample Client

- `scripts/test-client.mjs` contains a sample client to try invocations.

```sh
node scripts/test-client.mjs https://nextjs-mcp-use.vercel.app
```
