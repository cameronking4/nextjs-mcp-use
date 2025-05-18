// Import necessary modules from the AI SDK and OpenAI provider
import {
  streamText,
  createDataStreamResponse,
  appendClientMessage,
  type Message,
  type DataStreamWriter,
  type CoreUserMessage,
  type CoreAssistantMessage,
  type CoreSystemMessage
} from 'ai';
import { experimental_createMCPClient } from 'ai';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { openai } from '@ai-sdk/openai';

// Set the maximum duration for the response
export const maxDuration = 800;

// Define the POST handler
export async function POST(request: Request) {
  try {
    // Parse the incoming JSON request
    const json = await request.json();
    const { messages, message } = json;
    
    console.log('Received request with message:', message);

    // Initialize the OpenAI model
    const model = openai('gpt-4o');

    // Merge the new user message with existing messages
    const fullMessages: Message[] = appendClientMessage({
      messages: Array.isArray(messages) ? messages : [],
      message,
    });
    
    console.log('Processing with full messages count:', fullMessages.length);
    
    // Debug the message format
    console.log('Message format check:', JSON.stringify(fullMessages));

    // Create an MCP client using SSE transport with the server URL from env variables
    const serverUrl = process.env.MCP_SERVER_URL || 'http://localhost:3002/sse';
    console.log('Connecting to MCP server at:', serverUrl);
    
    const mcpClient = await experimental_createMCPClient({
      name: 'MyClient',
      transport: new SSEClientTransport(new URL(serverUrl)),
    });
    console.log('MCP client created successfully');

    // Retrieve tools from the MCP client
    const tools = await mcpClient.tools();
    console.log('Retrieved tools:', tools.length ? `${tools.length} tools available` : 'No tools available');

    // Create and return the data stream response
    return createDataStreamResponse({
      execute: async (dataStream) => {
        console.log('Starting to stream response');
        
        try {
          // Convert to proper CoreMessage format that streamText expects
          const formattedMessages: (CoreUserMessage | CoreAssistantMessage | CoreSystemMessage)[] = [];
          
          for (const msg of fullMessages) {
            if (typeof msg === 'object' && msg !== null) {
              if ('role' in msg && 'content' in msg) {
                const role = msg.role;
                const content = typeof msg.content === 'string' ? msg.content : String(msg.content);
                
                if (role === 'user') {
                  formattedMessages.push({ role: 'user', content });
                } else if (role === 'assistant') {
                  formattedMessages.push({ role: 'assistant', content });
                } else if (role === 'system') {
                  formattedMessages.push({ role: 'system', content });
                }
              }
            } else if (typeof msg === 'string') {
              formattedMessages.push({ role: 'user', content: msg });
            }
          }
          
          // Ensure we have at least one message
          if (formattedMessages.length === 0) {
            formattedMessages.push({ role: 'user', content: 'Hello' });
          }
          
          console.log('Formatted messages for LLM:', JSON.stringify(formattedMessages));
          
          const result = await streamText({
            model,
            messages: formattedMessages,
            tools,
            toolChoice: 'auto', // Options: 'auto', 'required', 'manual'
            maxSteps: 20,
          });
          
          console.log('Stream created successfully, merging into data stream');
          
          // Merge the result into the data stream
          await result.mergeIntoDataStream(dataStream, {
            sendReasoning: true,
          });
          
          console.log('Stream merged successfully');
        } catch (streamError: unknown) {
          console.error('Error in streaming:', streamError);
          const errorMessage = streamError instanceof Error ? streamError.message : 'Unknown error';
          console.error('Streaming error details:', errorMessage);
          
          // Return a simple error text directly without trying to use dataStream methods
          // The SDK will automatically handle stream closing
        }
      },
    });
  } catch (error: any) {
    console.error('Chat error:', error);
    return new Response(error.message || 'Server error', { status: 500 });
  }
}
