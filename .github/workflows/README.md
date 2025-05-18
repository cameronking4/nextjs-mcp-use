# GitHub Actions for MCP API Calls

This directory contains GitHub Action workflows for calling the Chat and Completions API endpoints. These workflows can be used to test the API endpoints, monitor their status, or integrate them into other workflows.

The workflows are pre-configured to use the deployed application at: https://nextjs-mcp-use.vercel.app

## Available Workflows

### 1. Manual Chat API Call (`manual-chat.yml`)

This workflow allows you to manually trigger a call to the Chat API endpoint.

**How to use:**
1. Go to the "Actions" tab in your GitHub repository
2. Select "Manual Chat API Call" from the list of workflows
3. Click "Run workflow"
4. Enter the message you want to send and the API URL
5. Click "Run workflow" again

The response will be saved as an artifact that you can download from the workflow run page.

### 2. Manual Completions API Call (`manual-completions.yml`)

This workflow allows you to manually trigger a call to the Completions API endpoint.

**How to use:**
1. Go to the "Actions" tab in your GitHub repository
2. Select "Manual Completions API Call" from the list of workflows
3. Click "Run workflow"
4. Enter the message you want to send and the API URL
5. Click "Run workflow" again

The response will be saved as an artifact that you can download from the workflow run page.

### 3. Scheduled API Calls (`scheduled-api-calls.yml`)

This workflow automatically calls both the Chat and Completions API endpoints on a daily schedule. It can also be triggered manually.

**Scheduled execution:**
- Runs every day at 00:00 UTC
- Uses repository secrets for API URLs and default message

**Manual execution:**
1. Go to the "Actions" tab in your GitHub repository
2. Select "Scheduled API Calls" from the list of workflows
3. Click "Run workflow"
4. Optionally, enter custom API URLs and message
5. Click "Run workflow" again

The responses will be saved as artifacts that you can download from the workflow run page.

## Configuration

### Repository Secrets

For the scheduled workflow, you can set the following repository secrets:

- `CHAT_API_URL`: The URL of your Chat API endpoint
- `COMPLETIONS_API_URL`: The URL of your Completions API endpoint
- `DEFAULT_API_MESSAGE`: The default message to send to the APIs

To set these secrets:
1. Go to your repository settings
2. Click on "Secrets and variables" > "Actions"
3. Click "New repository secret"
4. Enter the name and value of the secret
5. Click "Add secret"

## Customization

You can customize these workflows by editing the YAML files:

- Change the schedule by modifying the `cron` expression
- Add more steps to process the API responses
- Integrate with other services or workflows
- Add authentication headers if your API requires them
