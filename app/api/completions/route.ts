// Import necessary modules from the AI SDK and OpenAI provider
import {
  generateText,
  appendClientMessage,
  type Message,
  type CoreUserMessage,
  type CoreAssistantMessage,
  type CoreSystemMessage
} from 'ai';
import { openai } from '@ai-sdk/openai';
import { createMcpClients } from '../../../lib/mcp-clients';

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

    // Create MCP clients for all enabled servers in the registry
    console.log('Creating MCP clients from registry');
    
    const { tools } = await createMcpClients();
    console.log('Retrieved tools:', Object.keys(tools).length ? `${Object.keys(tools).length} tools available` : 'No tools available');

    try {
      // Convert to proper CoreMessage format that generateText expects
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
      
      // Generate complete text response instead of streaming
      const result = await generateText({
        model,
        messages: formattedMessages,
        tools,
        toolChoice: 'auto', // Options: 'auto', 'required', 'manual'
        maxSteps: 20,
      });
      
      console.log('Response generated successfully');
      
      // Return the response as markdown
      const response = {
        // Access the text property instead of content for the generateText result
        content: result.text,
        markdown: true, // Flag indicating the content should be treated as markdown
        toolCalls: result.steps?.flatMap(step => step.toolCalls || []) || [], // Extract tool calls from steps
        messages: formattedMessages // Include the original messages
      };
      
      // Return the response as JSON
      return Response.json(response);
      
    } catch (processError: unknown) {
      console.error('Error in processing:', processError);
      const errorMessage = processError instanceof Error ? processError.message : 'Unknown error';
      console.error('Processing error details:', errorMessage);
      
      return new Response(`Error: ${errorMessage}`, { status: 500 });
    }
  } catch (error: any) {
    console.error('Chat error:', error);
    return new Response(error.message || 'Server error', { status: 500 });
  }
}
