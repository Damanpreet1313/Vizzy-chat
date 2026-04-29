import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export const geminiModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

export const geminiChat = async (prompt: string, history: any[] = []) => {
  const chat = geminiModel.startChat({
    history,
  });

  const result = await chat.sendMessageStream(prompt);
  return result.stream;
};
