import { useCallback, useEffect, useState } from "react";
import Vapi from "@vapi-ai/web";
import { Message, TranscriptMessage, MessageTypeEnum, TranscriptMessageTypeEnum } from "@/lib/types/conversation.type";
import { vapi } from "./vapi.sdk";
import { envConfig } from "../../config/env.config";
import { storeCallStoryData } from "@/lib/supabase/client";

export enum CALL_STATUS {
  INACTIVE = "INACTIVE",
  LOADING = "LOADING",
  ACTIVE = "ACTIVE",
}

export const useVapi = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [callStatus, setCallStatus] = useState<CALL_STATUS>(CALL_STATUS.INACTIVE);
  const [isSpeechActive, setIsSpeechActive] = useState<boolean>(false);
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [activeTranscript, setActiveTranscript] = useState<TranscriptMessage | null>(null);
  const [currentCallId, setCurrentCallId] = useState<string | null>(null);
  const [callStartTime, setCallStartTime] = useState<Date | null>(null);

  /**
   * Fetches call data from Vapi API
   */
  const fetchCallData = async (callId: string) => {
    try {
      console.log("Fetching data for call ID:", callId);
      
      // Define the API URL for Vapi call data
      const apiUrl = `${envConfig.vapi.apiUrl}/call/${callId}`;
      
      // Make the API request with the private key for authentication
      const response = await fetch(apiUrl, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${envConfig.vapi.privateKey}`,
          "Content-Type": "application/json"
        }
      });
      
      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }
      
      const callData = await response.json();
      
      // Log the entire response data
      console.log("Full call data response:", callData);
      
      // Log specific fields for quick reference
      console.log("Call data retrieved:", {
        callId: callData.id,
        startedAt: callData.startedAt,
        endedAt: callData.endedAt,
        hasAnalysisData: !!callData.analysis,
        hasAnalysisStructuredData: !!callData.analysis?.structuredData
      });
      
      return callData;
    } catch (error) {
      console.error("Error fetching call data:", error);
      return null;
    }
  };

  /**
   * Fetches call data from Vapi API with retry mechanism
   */
  const fetchCallDataWithRetry = async (callId: string, maxRetries: number = 5, initialDelay: number = 2000): Promise<any> => {
    let lastError: Error | null = null;
    let retryCount = 0;
    
    // Try fetching with exponential backoff
    while (retryCount < maxRetries) {
      try {
        const waitTime = initialDelay * Math.pow(1.5, retryCount);
        console.log(`Attempt ${retryCount + 1}/${maxRetries}: Waiting ${waitTime}ms before fetching call data...`);
        
        // Wait before trying
        await new Promise((resolve) => setTimeout(resolve, waitTime));
        
        // Fetch call data
        const callData = await fetchCallData(callId);
        
        if (!callData) {
          console.log(`No call data returned on attempt ${retryCount + 1}, will retry`);
          retryCount++;
          continue;
        }
        
        // Check if we have structuredData in analysis
        const hasStructuredData = !!callData?.analysis?.structuredData &&
                                 Object.keys(callData.analysis.structuredData || {}).length > 0;
        
        // If we have structured data, return the data immediately
        if (hasStructuredData) {
          console.log(`✅ Successfully retrieved call data with analysis.structuredData on attempt ${retryCount + 1}/${maxRetries}`);
          return callData;
        }
        
        // If call is complete but no structured data, and we've made all attempts
        if (callData?.endedAt && retryCount >= maxRetries - 1) {
          console.log(`Call is complete (endedAt: ${callData.endedAt}) but no structuredData available after all attempts`);
          return callData;
        }
        
        // If call is still active (no endedAt) or we haven't hit max retries yet, keep trying
        if (retryCount < maxRetries - 1) {
          console.log(`Call data retrieved but structuredData not available yet on attempt ${retryCount + 1}/${maxRetries}. Retrying...`);
          retryCount++;
          continue;
        }
        
        // Last attempt and still no structured data
        console.log(`Final attempt ${maxRetries}/${maxRetries}: Call data retrieved but no structuredData available.`);
        return callData;
        
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.error(`Error on attempt ${retryCount + 1}/${maxRetries}:`, lastError);
        
        // Continue to next retry unless we've hit the maximum
        if (retryCount < maxRetries - 1) {
          retryCount++;
          continue;
        }
        
        // Last attempt failed with error
        throw lastError;
      }
    }
    
    // If we get here, we've exhausted all retries
    throw lastError || new Error(`Failed to retrieve call data with structured data after ${maxRetries} attempts`);
  };

  useEffect(() => {
    const onSpeechStart = () => setIsSpeechActive(true);
    const onSpeechEnd = () => {
      console.log("Speech has ended");
      setIsSpeechActive(false);
    };

    const onCallStartHandler = () => {
      console.log("Call has started");
      setCallStatus(CALL_STATUS.ACTIVE);
      setCallStartTime(new Date()); // Record call start time
    };

    const onCallEnd = async () => {
      console.log("Call has stopped");
      setCallStatus(CALL_STATUS.INACTIVE);
      
      // Fetch call data if we have a call ID
      if (currentCallId) {
        try {
          console.log("Starting retry process to fetch call data");
          
          // Try to fetch call data with retries - increased max retries and initial delay
          const callData = await fetchCallDataWithRetry(currentCallId, 10, 3000);
          
          if (callData) {
            // Log structured data from analysis
            if (callData.analysis?.structuredData) {
              console.log("Structured data found in analysis:", callData.analysis.structuredData);
            } else {
              console.log("No structured data found in analysis field");
            }
            
            // Store story data in Supabase
            const result = await storeCallStoryData(callData);
            
            if (!result.success) {
              console.error("Failed to store call story data:", result.error);
            } else {
              console.log("Successfully stored story data in Supabase");
              console.log(`Story ID: ${result.storyId}`);
              console.log(`Character ID: ${result.characterId}`);
              console.log(`Story Input ID: ${result.storyInputId}`);
              
              // You could potentially navigate to a story details page or 
              // display a success message to the user here
            }
          } else {
            console.warn("No call data returned from API after multiple retries");
          }
        } catch (error) {
          console.error("Error processing call data:", error);
        }
      } else {
        console.warn("No call ID available, cannot fetch call data");
      }
      
      // Reset call start time and ID
      setCallStartTime(null);
      setCurrentCallId(null);
    };

    const onVolumeLevel = (volume: number) => {
      setAudioLevel(volume);
    };

    const onMessageUpdate = (message: Message) => {
      console.log("message", message);
      if (
        message.type === MessageTypeEnum.TRANSCRIPT &&
        message.transcriptType === TranscriptMessageTypeEnum.PARTIAL
      ) {
        setActiveTranscript(message as TranscriptMessage);
      } else {
        setMessages((prev) => [...prev, message]);
        setActiveTranscript(null);
      }
    };

    const onError = (e: any) => {
      setCallStatus(CALL_STATUS.INACTIVE);
      console.error(e);
    };

    vapi.on("speech-start", onSpeechStart);
    vapi.on("speech-end", onSpeechEnd);
    vapi.on("call-start", onCallStartHandler);
    vapi.on("call-end", onCallEnd);
    vapi.on("volume-level", onVolumeLevel);
    vapi.on("message", onMessageUpdate);
    vapi.on("error", onError);

    return () => {
      vapi.off("speech-start", onSpeechStart);
      vapi.off("speech-end", onSpeechEnd);
      vapi.off("call-start", onCallStartHandler);
      vapi.off("call-end", onCallEnd);
      vapi.off("volume-level", onVolumeLevel);
      vapi.off("message", onMessageUpdate);
      vapi.off("error", onError);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentCallId, callStartTime]);

  const start = async () => {
    setCallStatus(CALL_STATUS.LOADING);
    const response = vapi.start(envConfig.vapi.assistantId);

    response.then((res) => {
      console.log("call", res);
      // Store the call ID when the call starts
      if (res && res.id) {
        setCurrentCallId(res.id);
        console.log("Call ID stored:", res.id);
      }
    });
  };

  const stop = () => {
    setCallStatus(CALL_STATUS.LOADING);
    vapi.stop();
  };

  const toggleCall = () => {
    if (callStatus == CALL_STATUS.ACTIVE) {
      stop();
    } else {
      start();
    }
  };

  return {
    vapi,
    messages,
    setMessages,
    callStatus,
    toggleCall,
    isSpeechActive,
    activeTranscript,
    audioLevel,
  };
};
