import React from 'react';
import {
  Message,
  MessageTypeEnum,
  TranscriptMessage,
} from "@/lib/types/conversation.type";
import { ConversationMessage } from "./ConversationMessage";
import FunctionCallResult from "./FunctionCallResult";
import { TextInput } from '../../components/ui/TextInput';
import { sendMessageToOpenAI } from '../../services/openai.service';


interface MessageListProps {
  messages: Message[];
  activeTranscript?: TranscriptMessage | null;
  onSendMessage: (message: string) => void;
  useDirectLLM: boolean;
}

export function MessageList({ messages, activeTranscript, onSendMessage, useDirectLLM }: MessageListProps) {
  console.log("messages", messages);
  const handleSendMessage = async (message: string) => {
    if (useDirectLLM) {
      const response = await sendMessageToOpenAI(messages.concat({
        type: MessageTypeEnum.TRANSCRIPT,
        role: 'user',
        content: message,
        timestamp: new Date().toISOString(),
      }));
      onSendMessage(response || 'Sorry, I couldn\'t process that.');
    } else {
      onSendMessage(message);
    }
  };

  return (
    <>
      {messages.map((message, index) =>
        message.type === MessageTypeEnum.TRANSCRIPT ? (
          <ConversationMessage
            message={message}
            key={message.type + message?.role + index}
          />
        ) : message.type === MessageTypeEnum.FUNCTION_CALL_RESULT ? (
          <FunctionCallResult key={message.type + index} message={message} />
        ) : null
      )}
      {activeTranscript ? (
        <ConversationMessage message={activeTranscript} />
      ) : null}
      {useDirectLLM && <TextInput onSendMessage={handleSendMessage} />}
    </>
  );
}
