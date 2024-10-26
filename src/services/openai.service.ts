import { Message } from '@/lib/types/conversation.type';

export async function sendMessageToOpenAI(messages: Message[]) {
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messages }),
    });

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    const data = await response.json();
    return data.content;
  } catch (error) {
    console.error('Error calling backend API:', error);
    throw error;
  }
}