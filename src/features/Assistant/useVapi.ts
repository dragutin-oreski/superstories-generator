import { envConfig } from "../../config/env.config";
import {
  Message,
  MessageTypeEnum,
  TranscriptMessage,
  TranscriptMessageTypeEnum,
} from "@/lib/types/conversation.type";
import { useEffect, useState } from "react";
import { vapi } from "./vapi.sdk";

export enum CALL_STATUS {
  INACTIVE = "inactive",
  ACTIVE = "active",
  LOADING = "loading",
}

export function useVapi() {
  const [isSpeechActive, setIsSpeechActive] = useState(false);
  const [callStatus, setCallStatus] = useState<CALL_STATUS>(
    CALL_STATUS.INACTIVE
  );

  const [messages, setMessages] = useState<Message[]>([]);

  const [activeTranscript, setActiveTranscript] =
    useState<TranscriptMessage | null>(null);

  const [audioLevel, setAudioLevel] = useState(0);
  
  // State to store the current call ID
  const [currentCallId, setCurrentCallId] = useState<string | null>(null);

  // Simple function to fetch and log analytics data
  const fetchCallAnalytics = async (callId: string) => {
    try {
      console.log("Fetching analytics for call ID:", callId);
      
      // Construct the API URL for the analytics endpoint
      const apiUrl = `${envConfig.vapi.apiUrl}/call/${callId}/analytics`;
      
      // Make the API request with the private key for authentication
      const response = await fetch(apiUrl, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${envConfig.vapi.privateKey}`,
          "Content-Type": "application/json"
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch analytics: ${response.status}`);
      }
      
      const analyticsData = await response.json();
      
      // Log the complete analytics data
      console.log("Call Analytics Data:", analyticsData);
      
      // You can process specific data points here if needed
      // For example:
      if (analyticsData.duration) {
        console.log("Call Duration:", analyticsData.duration);
      }
      
      if (analyticsData.transcript) {
        console.log("Transcript Length:", analyticsData.transcript.length);
      }
      
      // Return the data in case you want to use it elsewhere
      return analyticsData;
    } catch (error) {
      console.error("Error fetching call analytics:", error);
      return null;
    }
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
    };

    const onCallEnd = async () => {
      console.log("Call has stopped");
      setCallStatus(CALL_STATUS.INACTIVE);
      
      // Fetch analytics data if we have a call ID
      if (currentCallId) {
        await fetchCallAnalytics(currentCallId);
      }
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
        setActiveTranscript(message);
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
  }, [currentCallId]);

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
    isSpeechActive,
    callStatus,
    audioLevel,
    activeTranscript,
    messages,
    start,
    stop,
    toggleCall,
    currentCallId,
  };
}
