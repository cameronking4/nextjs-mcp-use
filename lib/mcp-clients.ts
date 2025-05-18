import { experimental_createMCPClient, type Tool, type ToolSet } from 'ai';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import fs from 'fs';
import path from 'path';

// Define types for our registry
type ServerConfig = {
  url: string;
  enabled: boolean;
  env?: Record<string, string>;
};

type Registry = Record<string, ServerConfig>;

// Load the MCP registry
const registryPath = path.join(process.cwd(), 'config', 'mcp-registry.json');
let mcpRegistry: Registry = {};

try {
  if (fs.existsSync(registryPath)) {
    mcpRegistry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
    console.log(`Loaded MCP registry with ${Object.keys(mcpRegistry).length} servers`);
  } else {
    console.warn(`MCP registry file not found at ${registryPath}, using empty registry`);
  }
} catch (error) {
  console.error(`Error loading MCP registry:`, error);
}

export async function createMcpClients() {
  const clients: Awaited<ReturnType<typeof experimental_createMCPClient>>[] = [];
  const allTools: ToolSet = {};
  
  // Create clients for all enabled servers
  for (const [serverName, config] of Object.entries(mcpRegistry)) {
    if (!config.enabled) {
      console.log(`MCP server "${serverName}" is disabled, skipping`);
      continue;
    }
    
    if (!config.url) {
      console.warn(`MCP server "${serverName}" does not have a URL configured, skipping`);
      continue;
    }
    
    try {
      // Set environment variables if specified in the config
      if (config.env) {
        for (const [key, value] of Object.entries(config.env)) {
          process.env[key] = value;
        }
      }
      
      // Create SSE client with timeout
      console.log(`Connecting to MCP server "${serverName}" at ${config.url}`);
      const clientPromise = experimental_createMCPClient({
        name: serverName,
        transport: new SSEClientTransport(new URL(config.url)),
      });
      
      // Add timeout to prevent hanging if server is not responding
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error(`Connection to MCP server "${serverName}" timed out after 5 seconds`)), 5000);
      });
      
      // Race the client creation against the timeout
      const client = await Promise.race([clientPromise, timeoutPromise]).catch(error => {
        console.error(`Failed to connect to MCP server "${serverName}":`, error.message);
        return null;
      }) as Awaited<ReturnType<typeof experimental_createMCPClient>> | null;
      
      if (!client) continue;
      
      clients.push(client);
      
      // Get tools from this client with timeout
      try {
        const toolsPromise = client.tools();
        const toolsTimeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error(`Tools retrieval from MCP server "${serverName}" timed out after 3 seconds`)), 3000);
        });
        
        const toolsObj = await Promise.race([toolsPromise, toolsTimeoutPromise])
          .catch(error => {
            console.error(`Failed to retrieve tools from MCP server "${serverName}":`, error.message);
            return {} as Record<string, Tool>;
          }) as Record<string, Tool>;
        
        // Merge tools into allTools
        Object.assign(allTools, toolsObj);
        
        console.log(`Connected to MCP server "${serverName}" with ${Object.keys(toolsObj).length} tools`);
      } catch (toolsError) {
        console.error(`Error retrieving tools from MCP server "${serverName}":`, toolsError);
      }
    } catch (error) {
      console.error(`Failed to connect to MCP server "${serverName}":`, error);
    }
  }
  
  console.log(`Total MCP clients: ${clients.length}, Total tools: ${Object.keys(allTools).length}`);
  
  return {
    clients,
    tools: allTools,
  };
}
