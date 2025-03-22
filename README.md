# Vapi Integration Starter Template

This starter template is designed to help you quickly integrate Vapi into your project. It showcases a bot that assists authors in defining characters for their stories, demonstrating the ease of integrating Vapi to manipulate the frontend, display backend results, and leverage other capabilities.

## Features

- **Real-time Interaction**: Interact with the bot in real-time to refine character traits and details.
- **Message Handling**: Send and receive messages to and from the bot, handling different message types.
- **Audio Level Visualization**: Visual feedback on the audio level during bot interaction.
- **Event Handling**: Start, stop, and toggle bot calls with proper event management.

## Getting Started

1. Clone the repository.
2. Install dependencies with `npm install`.
3. Set up your `.env` file with the required Vapi tokens.
4. Run the development server with `npm run dev`.

## Integration Points

- **Vapi SDK**: Integrated via `vapi.sdk.ts` to manage the Vapi instance.
- **React Hooks**: `useVapi.ts` to encapsulate Vapi logic within React components.
- **Event Listeners**: Set up listeners for various Vapi events like speech start/end, call start/end, and message updates.
- **Message Components**: Render messages and transcripts in real-time as they are received from the bot.
- **Character Details**: Edit and save character details, which are then sent as messages to the bot for processing.

## Project Structure

- `src/`: Source files for the application.
- `src/features/Assistant/`: Components and hooks related to Vapi integration.
- `src/features/Character/`: Components for character details and manipulation.
- `src/lib/`: Shared types and utility functions.
- `src/components/ui/`: Reusable UI components.

## Customization

You can customize the bot's behavior and appearance by modifying the `character.assistant.ts` and the corresponding React components.

## Setting Up for Production

This guide covers how to prepare the Vapi integration for production deployment.

### 1. Environment Configuration

Create a production environment file (`.env.production`) based on the `.env.example` template:

```bash
VITE_VAPI_API_URL=https://api.vapi.ai
VITE_VAPI_WEB_TOKEN=your-web-token
VITE_VAPI_PRIVATE_KEY=your-private-key
VITE_VAPI_ASSISTANT_ID=your-assistant-id

# Supabase Configuration
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```

Replace all the placeholder values with your actual production credentials:

- **Vapi Credentials**: Obtain these from your Vapi dashboard
- **Supabase Credentials**: Get these from your Supabase project settings

### 2. Database Setup

Ensure your Supabase database has the following tables:

- `stories`: For storing generated story data
- `story_analytics`: For storing call analytics
- `characters`: For storing character data
- `story_inputs`: For storing user inputs

You can find the table schema in the `src/lib/supabase/client.ts` file.

### A quick reference of required tables structure:

#### stories
- `id`: UUID (primary key)
- `status`: String
- `user_id`: UUID
- `title`: String
- `created_at`: Timestamp

#### story_analytics
- `id`: UUID (primary key)
- `story_id`: UUID (foreign key to stories.id)
- `llm_calls`: Integer
- `tool_calls`: Integer
- `actions`: Integer
- `errors`: JSON
- `duration`: Integer
- `cost`: Float
- `created_at`: Timestamp
- `flesch_kincaid_readability_score`: Float (nullable)
- `flesch_readability_score`: Float (nullable)
- `gunning_fog_readability_score`: Float (nullable)

### 3. Build and Deployment

Build the project for production:

```bash
npm run build
```

The production-ready files will be generated in the `dist` directory, which you can deploy to your hosting provider of choice (Netlify, Vercel, etc.).

For Netlify deployment, the `netlify.toml` file is already configured in the repository.

### 4. Analytics Integration

The application automatically collects analytics data from Vapi API calls and stores it in Supabase. This includes:

- Call duration
- LLM token usage (prompt and completion)
- Cost information
- Transcript data
- Error tracking

To view analytics:
1. Set up a dashboard in Supabase or connect to a tool like Metabase
2. Query the `story_analytics` table for insights

### 5. Security Considerations

For production deployment, ensure:

1. **Environment Security**: Never expose your private keys in client-side code. The current implementation securely handles API calls.
2. **Rate Limiting**: Consider implementing rate limiting for the Vapi calls to control costs.
3. **Error Handling**: The application includes robust error handling, but consider adding monitoring tools for production.
4. **User Authentication**: Add user authentication to restrict access to the application and associate calls with specific users.

### 6. Performance Optimization

- The application includes a 2-second delay after call completion before fetching analytics to ensure the Vapi API has processed the call data.
- Consider implementing caching for frequently accessed data.
- For high-traffic applications, consider implementing server-side analytics processing.

### 7. Monitoring and Maintenance

- Set up alerts for failed API calls or database operations.
- Regularly review analytics data to optimize costs and performance.
- Update Vapi tokens and credentials as needed.

## Troubleshooting

### Common Issues

1. **Analytics Not Appearing**: Ensure the `currentCallId` is correctly set when the call starts. Check the console logs for any errors.
2. **API Rate Limiting**: If you're making many calls, you might hit Vapi's rate limits. Implement proper throttling.
3. **Database Connection Issues**: Verify your Supabase credentials and ensure the database is accessible from your deployment environment.

For additional help, refer to the [Vapi documentation](https://docs.vapi.ai/) or the [Supabase documentation](https://supabase.io/docs).
