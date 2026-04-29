export const groqSTT = async (audioBlob: Blob) => {
  const formData = new FormData();

  // react-media-recorder records as audio/webm in most browsers.
  // Groq Whisper needs the extension to match the real MIME type.
  const mimeType = audioBlob.type || "audio/webm";
  const ext = mimeType.includes("webm")
    ? "webm"
    : mimeType.includes("ogg")
    ? "ogg"
    : mimeType.includes("mp4")
    ? "mp4"
    : "wav";

  formData.append("file", audioBlob, `audio.${ext}`);
  formData.append("model", "whisper-large-v3");
  formData.append("response_format", "json");

  const response = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => response.statusText);
    throw new Error(`Groq STT error ${response.status}: ${errText}`);
  }

  const result = await response.json();
  return result.text as string;
};
