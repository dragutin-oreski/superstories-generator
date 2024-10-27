import React, { useState, useEffect, useRef } from 'react';
import AbstractBall from '@/components/vapi/glob';
import { CALL_STATUS, useVapi } from "./features/Assistant";
import { ScrollArea } from "@/components/ui/ScrollArea";
import { VapiButton, vapi } from "./features/Assistant";
import { MessageList } from "./features/Messages";
import { CharacterPreview } from "./features/Character";

function App() {
  const scrollAreaRef = useRef<any>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    const viewport = viewportRef.current;
    if (viewport) {
      viewport.scrollTop = viewport.scrollHeight;
    }
  };

  const { toggleCall, messages, callStatus, activeTranscript, audioLevel } = useVapi();

  useEffect(() => {
    vapi.on("message", scrollToBottom);
    return () => {
      vapi.off("message", scrollToBottom);
    };
  }, []);

  const [config, setConfig] = useState({
    perlinTime: 50.0,
    perlinDNoise: 2.5,
    chromaRGBr: 7.5,
    chromaRGBg: 5,
    chromaRGBb: 7,
    chromaRGBn: 0,
    chromaRGBm: 1.0,
    sphereWireframe: false,
    spherePoints: false,
    spherePsize: 1.0,
    cameraSpeedY: 0.0,
    cameraSpeedX: 0.0,
    cameraZoom: 175,
    cameraGuide: false,
    perlinMorph: 5.5,
  });

  useEffect(() => {
    if (callStatus === CALL_STATUS.ACTIVE && audioLevel > 0) {
      setConfig(prevConfig => ({
        ...prevConfig,
        perlinTime: 50.0,
        perlinMorph: 15.5,
      }));
    } else if (callStatus === CALL_STATUS.ACTIVE) {
      setConfig(prevConfig => ({
        ...prevConfig,
        perlinTime: 15.0,
        perlinMorph: 5.0,
      }));
    } else {
      setConfig(prevConfig => ({
        ...prevConfig,
        perlinTime: 5.0,
        perlinMorph: 0,
      }));
    }
  }, [callStatus, audioLevel]);

  return (
    <main className="flex flex-col h-screen relative bg-gray-900 text-white overflow-hidden">
      {/* AbstractBall Component with Responsive Sizing */}
      <div className="w-full h-[30vh] md:h-[300px] absolute top-0 left-0 right-0 z-20">
        <AbstractBall {...config} />
      </div>

      <div className="flex flex-col flex-1 relative">
        <div className="flex-grow" />
        <div className="w-full max-w-3xl mx-auto px-4 pb-4 relative">
          {/* Gradient overlay for fade effect */}
          <div className="absolute top-0 left-0 right-0 h-1/3 z-10 pointer-events-none bg-gradient-to-b from-gray-900 to-transparent" />

          <ScrollArea
            ref={scrollAreaRef}
            viewportRef={viewportRef}
            className="h-[calc(70vh-4rem)] md:h-[calc(100vh-450px)]"
          >
            <div className="flex flex-col justify-end min-h-full pb-20">
              <MessageList
                messages={messages}
                activeTranscript={activeTranscript}
              />
            </div>
          </ScrollArea>

          <div
            className="absolute bottom-0 left-0 right-0 flex justify-center py-4 bg-gradient-to-t from-gray-900 to-transparent"
          >
            <VapiButton
              audioLevel={audioLevel}
              callStatus={callStatus}
              toggleCall={toggleCall}
            />
          </div>
        </div>
      </div>
    </main>
  );
}

export default App;