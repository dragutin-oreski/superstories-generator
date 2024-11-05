export const envConfig = {
  vapi: {
    apiUrl: import.meta.env.VITE_VAPI_API_URL ?? "https://api.vapi.ai",
    token: import.meta.env.VITE_VAPI_WEB_TOKEN ?? "vapi-web-token",
    privateKey: import.meta.env.VITE_VAPI_PRIVATE_KEY ?? "vapi-private-key",
    assistantId: import.meta.env.VITE_VAPI_ASSISTANT_ID ?? "vapi-assistant-id",
  },
};
