"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useReactMediaRecorder } from "react-media-recorder";
import { Mic, Square, Loader2, AlertCircle } from "lucide-react";
import WaveSurfer from "wavesurfer.js";
import { cn } from "@/lib/utils";

interface VoiceRecorderProps {
  onTranscription: (text: string) => void;
}

export const VoiceRecorder = ({ onTranscription }: VoiceRecorderProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [sttError, setSttError] = useState(false);
  const waveformRef = useRef<HTMLDivElement>(null);
  const wavesurfer = useRef<WaveSurfer | null>(null);

  const { status, startRecording, stopRecording, mediaBlobUrl } =
    useReactMediaRecorder({ audio: true });

  const isRecording = status === "recording";

  const handleAudioUpload = useCallback(
    async (blobUrl: string) => {
      setIsProcessing(true);
      setSttError(false);
      try {
        const audioBlob = await fetch(blobUrl).then((r) => r.blob());
        const formData = new FormData();
        const mimeType = audioBlob.type || "audio/webm";
        const ext = mimeType.includes("webm")
          ? "webm"
          : mimeType.includes("ogg")
          ? "ogg"
          : mimeType.includes("mp4")
          ? "mp4"
          : "wav";
        formData.append("file", audioBlob, `audio.${ext}`);

        const response = await fetch("/api/stt", { method: "POST", body: formData });
        if (!response.ok) throw new Error("Transcription failed");
        const data = await response.json();
        if (data.text) onTranscription(data.text);
      } catch (err) {
        console.error("STT error:", err);
        setSttError(true);
        setTimeout(() => setSttError(false), 3000);
      } finally {
        setIsProcessing(false);
      }
    },
    [onTranscription]
  );

  useEffect(() => {
    if (waveformRef.current && !wavesurfer.current) {
      wavesurfer.current = WaveSurfer.create({
        container: waveformRef.current,
        waveColor: "#818cf8",
        progressColor: "#6366f1",
        cursorColor: "transparent",
        barWidth: 2,
        barRadius: 3,
        height: 28,
        barGap: 2,
      });
    }
  }, []);

  useEffect(() => {
    if (!mediaBlobUrl) return;
    if (wavesurfer.current) wavesurfer.current.load(mediaBlobUrl);
    // Defer to avoid calling setState synchronously inside an effect
    const url = mediaBlobUrl;
    setTimeout(() => { void handleAudioUpload(url); }, 0);
  }, [mediaBlobUrl, handleAudioUpload]);

  return (
    <button
      onClick={isRecording ? stopRecording : startRecording}
      disabled={isProcessing}
      title={isProcessing ? "Transcribing…" : isRecording ? "Stop recording" : "Record voice"}
      className={cn(
        "p-1.5 rounded-full transition-all duration-150",
        isRecording
          ? "text-red-400 animate-pulse"
          : sttError
          ? "text-destructive"
          : "text-muted-foreground hover:text-foreground hover:bg-muted"
      )}
    >
      {isProcessing ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : sttError ? (
        <AlertCircle className="w-4 h-4" />
      ) : isRecording ? (
        <Square className="w-4 h-4 fill-current" />
      ) : (
        <Mic className="w-4 h-4" />
      )}
    </button>
  );
};
