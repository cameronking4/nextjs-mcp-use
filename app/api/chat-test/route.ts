import { NextResponse } from 'next/server';

export async function GET() {
  const html = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Chat API Test</title>
    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
        max-width: 800px;
        margin: 0 auto;
        padding: 20px;
        color: #333;
      }
      h1 {
        color: #0070f3;
        text-align: center;
        margin-bottom: 30px;
      }
      #chat-container {
        border: 1px solid #ccc;
        border-radius: 8px;
        padding: 20px;
        height: 400px;
        overflow-y: auto;
        margin-bottom: 20px;
        background-color: #f9f9f9;
        display: flex;
        flex-direction: column;
      }
      .message {
        margin-bottom: 10px;
        padding: 10px;
        border-radius: 8px;
        max-width: 80%;
        word-wrap: break-word;
      }
      .user-message {
        background-color: #e1f5fe;
        align-self: flex-end;
        margin-left: auto;
      }
      .assistant-message {
        background-color: #f1f1f1;
        align-self: flex-start;
      }
      .error-message {
        background-color: #ffebee;
        color: #c62828;
        align-self: center;
        width: 90%;
        text-align: center;
      }
      #message-form {
        display: flex;
        gap: 10px;
      }
      #message-input {
        flex-grow: 1;
        padding: 10px;
        border: 1px solid #ccc;
        border-radius: 4px;
        font-size: 16px;
      }
      button {
        padding: 10px 20px;
        background-color: #0070f3;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 16px;
        transition: background-color 0.2s;
      }
      button:hover {
        background-color: #0051a8;
      }
      button:disabled {
        background-color: #ccc;
        cursor: not-allowed;
      }
      #status {
        margin-top: 10px;
        color: #666;
        height: 20px;
      }
      .loading {
        display: inline-block;
        width: 20px;
        height: 20px;
        border: 3px solid rgba(0, 112, 243, 0.3);
        border-radius: 50%;
        border-top-color: #0070f3;
        animation: spin 1s ease-in-out infinite;
        margin-left: 10px;
        vertical-align: middle;
      }
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
      .debug-info {
        margin-top: 20px;
        padding: 10px;
        background-color: #f5f5f5;
        border-radius: 4px;
        font-size: 14px;
        color: #666;
        display: none;
        white-space: pre-wrap;
        max-height: 300px;
        overflow-y: auto;
      }
      .debug-toggle {
        background: none;
        border: none;
        color: #0070f3;
        cursor: pointer;
        font-size: 14px;
        padding: 0;
        margin-top: 10px;
        text-decoration: underline;
      }
    </style>
  </head>
  <body>
    <h1>Chat API Test</h1>
    <div id="chat-container"></div>
    <form id="message-form">
      <input type="text" id="message-input" placeholder="Type your message here..." required>
      <button type="submit" id="send-button">Send</button>
    </form>
    <div id="status"></div>
    <button class="debug-toggle" id="debug-toggle">Show Debug Info</button>
    <div class="debug-info" id="debug-info"></div>

    <script>
      const chatContainer = document.getElementById('chat-container');
      const messageForm = document.getElementById('message-form');
      const messageInput = document.getElementById('message-input');
      const statusDiv = document.getElementById('status');
      const sendButton = document.getElementById('send-button');
      const debugToggle = document.getElementById('debug-toggle');
      const debugInfo = document.getElementById('debug-info');
      
      let messages = [];
      let isProcessing = false;

      // Toggle debug info
      debugToggle.addEventListener('click', () => {
        if (debugInfo.style.display === 'block') {
          debugInfo.style.display = 'none';
          debugToggle.textContent = 'Show Debug Info';
        } else {
          debugInfo.style.display = 'block';
          debugToggle.textContent = 'Hide Debug Info';
        }
      });

      messageForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const message = messageInput.value.trim();
        if (!message || isProcessing) return;
        
        // Set UI to loading state
        isProcessing = true;
        sendButton.disabled = true;
        messageInput.disabled = true;
        
        // Add user message to UI
        addMessageToUI('user', message);
        messageInput.value = '';
        
        // Add to messages array - ensure proper format with role and content
        messages.push({ role: 'user', content: message });
        
        try {
          setStatus('Sending message...', true);
          
          // Log what we're sending
          const requestBody = {
            messages: messages.slice(0, -1),
            message: message
          };
          
          debugInfo.textContent = \`Sending request: \${JSON.stringify(requestBody, null, 2)}\`;
          
          const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
          });
          
          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(\`HTTP error! status: \${response.status}, message: \${errorText}\`);
          }
          
          setStatus('Receiving response...', true);
          
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let assistantMessage = '';
          
          // Create an initial empty assistant message in the UI
          addMessageToUI('assistant', '');
          
          let debugText = '';
          
          // Process the stream
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value, { stream: true });
            debugText += chunk;
            debugInfo.textContent = \`Sending request: \${JSON.stringify(requestBody, null, 2)}\n\nReceiving response:\n\${debugText}\`;
            
            try {
              // Split the chunk by any whitespace or newlines
              const parts = chunk.trim().split(/\\s+|\\n+/);
              
              for (const part of parts) {
                // Handle text content tokens
                if (part.startsWith('0:')) {
                  // Extract text content from format like 0:"text"
                  const match = part.match(/0:"([^"]*)"/);
                  if (match && match[1]) {
                    assistantMessage += match[1];
                    updateAssistantMessage(assistantMessage);
                  }
                }
                // Log other token types in debug info only
                else if (part.startsWith('f:') || part.startsWith('e:') || part.startsWith('d:')) {
                  // Just log these in debug info
                }
              }
            } catch (e) {
              console.error('Error parsing chunk:', e);
              debugInfo.textContent += \`\n\nError parsing chunk: \${e.message}\n\${chunk}\`;
            }
          }
          
          if (assistantMessage) {
            // Add final assistant message to messages array
            messages.push({ role: 'assistant', content: assistantMessage });
            setStatus('Response complete');
          } else {
            setStatus('No response received');
            addMessageToUI('error', 'No response received from the server');
          }
          
        } catch (error) {
          console.error('Error:', error);
          setStatus(\`Error: \${error.message}\`);
          addMessageToUI('error', \`Error: \${error.message}\`);
        } finally {
          // Reset UI state
          isProcessing = false;
          sendButton.disabled = false;
          messageInput.disabled = false;
          messageInput.focus();
        }
      });
      
      function addMessageToUI(role, content) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message');
        
        if (role === 'user') {
          messageDiv.classList.add('user-message');
        } else if (role === 'assistant') {
          messageDiv.classList.add('assistant-message');
          messageDiv.id = 'assistant-message-current';
        } else if (role === 'error') {
          messageDiv.classList.add('error-message');
        }
        
        messageDiv.textContent = content;
        chatContainer.appendChild(messageDiv);
        chatContainer.scrollTop = chatContainer.scrollHeight;
      }
      
      function updateAssistantMessage(content) {
        let messageDiv = document.getElementById('assistant-message-current');
        if (!messageDiv) {
          messageDiv = document.createElement('div');
          messageDiv.classList.add('message', 'assistant-message');
          messageDiv.id = 'assistant-message-current';
          chatContainer.appendChild(messageDiv);
        }
        
        messageDiv.textContent = content;
        chatContainer.scrollTop = chatContainer.scrollHeight;
      }
      
      function setStatus(message, loading = false) {
        statusDiv.innerHTML = message;
        if (loading) {
          const loadingSpinner = document.createElement('div');
          loadingSpinner.classList.add('loading');
          statusDiv.appendChild(loadingSpinner);
        }
      }
    </script>
  </body>
  </html>
  `;

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html',
    },
  });
} 