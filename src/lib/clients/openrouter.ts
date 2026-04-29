export const openRouterChat = async (messages: any[]) => {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    console.log("No OpenRouter API key found. Falling back to Pollinations.ai (Free)...");
    return fetch("https://text.pollinations.ai/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        messages,
        model: "openai", 
        stream: true
      }),
    });
  }

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      "X-Title": "Vizzy Chat",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "openrouter/auto", 
      messages,
      stream: true,
    }),
  });

  return response;
};
