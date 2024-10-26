import React, { useState, useRef, useEffect } from 'react';
import { ScrollArea } from "@/components/ui/ScrollArea";
import { VapiButton, vapi } from "./features/Assistant";
import { MessageList } from "./features/Messages";
import { useVapi } from "./features/Assistant";
import { CharacterPreview } from "./features/Character";
import { characterAssistant } from './assistants/character.assistant';
import { Message, MessageTypeEnum, TranscriptMessage } from '@/lib/types/conversation.type';
import { sendMessageToOpenAI } from './services/openai.service';


function App() {
  const scrollAreaRef = useRef<any>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [useDirectLLM, setUseDirectLLM] = useState(false);
  const [localMessages, setLocalMessages] = useState<Message[]>([]);

  const scrollToBottom = () => {
    const viewport = viewportRef.current;
    if (viewport) {
      viewport.scrollTop = viewport.scrollHeight;
    }
  };

  const { toggleCall, messages, callStatus, activeTranscript, audioLevel } =
    useVapi();

  useEffect(() => {
    vapi.on("message", scrollToBottom);
    return () => {
      vapi.off("message", scrollToBottom);
    };
  });

  const toggleLLMMode = () => {
    setUseDirectLLM(!useDirectLLM);
  };

const handleSendMessage = async (message: string) => {
    const newUserMessage: TranscriptMessage = {
      type: MessageTypeEnum.TRANSCRIPT,
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
    };

    if (useDirectLLM) {
      setLocalMessages(prev => [...prev, newUserMessage]);
      try {
        const response = await sendMessageToOpenAI([...localMessages, newUserMessage]);
        const assistantMessage: TranscriptMessage = {
          type: MessageTypeEnum.TRANSCRIPT,
          role: 'assistant',
          content: response || 'Sorry, I couldn\'t process that.',
          timestamp: new Date().toISOString(),
        };
        setLocalMessages(prev => [...prev, assistantMessage]);
      } catch (error) {
        console.error('Error sending message to OpenAI:', error);
        // Handle error (e.g., show error message to user)
      }
    } else {
      // For voice mode, we'll use the existing vapi system
      // You might need to adjust this based on how your vapi system works
      vapi.send(message);
    }
    scrollToBottom();
  };

  return (
    <main className="flex h-screen">
      <CharacterPreview />
      <div
        id="card"
        className="text-slate-950 dark:text-slate-50 w-full relative"
      >
        {/* <div
          id="card-header"
          className="flex flex-col space-y-1.5 p-6 shadow pb-4"
        ></div> */}
        <div id="card-content" className="p-6 pt-0">
          <ScrollArea
            ref={scrollAreaRef}
            viewportRef={viewportRef}
            className="h-[90vh] flex flex-1 p-4"
          >
            <div className="flex flex-1 flex-col min-h-[85vh] justify-end">
              <MessageList
                messages={messages}
                activeTranscript={activeTranscript}
                onSendMessage={handleSendMessage}
                useDirectLLM={useDirectLLM}
              />
            </div>
          </ScrollArea>
        </div>
        <div
          id="card-footer"
          className="flex justify-center absolute bottom-0 left-0 right-0 py-4"
        >
          {!useDirectLLM && (
            <VapiButton
              audioLevel={audioLevel}
              callStatus={callStatus}
              toggleCall={toggleCall}
            />
          )}
          <button onClick={toggleLLMMode}>
            {useDirectLLM ? 'Switch to Voice' : 'Switch to Text'}
          </button>
        </div>
      </div>
    </main>
  );
}

export default App;
