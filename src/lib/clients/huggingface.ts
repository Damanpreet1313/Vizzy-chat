export const hfImageGeneration = async (prompt: string): Promise<Blob> => {
  const token = process.env.HUGGINGFACE_API_TOKEN;

  if (!token) {
    console.log("No Hugging Face token found. Falling back to Pollinations.ai (Free)...");
    return pollinationsFallback(prompt);
  }

  // HuggingFace models can be cold — retry up to 3 times if the model is loading
  for (let attempt = 1; attempt <= 3; attempt++) {
    const response = await fetch(
      "https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell",
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        method: "POST",
        body: JSON.stringify({ inputs: prompt }),
      }
    );

    if (response.ok) {
      return await response.blob();
    }

    // 503 = model is still loading; wait and retry
    if (response.status === 503) {
      const json = await response.json().catch(() => ({}));
      const waitSecs: number = json.estimated_time ?? 20;
      console.log(
        `HuggingFace model loading (attempt ${attempt}/3). Waiting ${waitSecs}s...`
      );
      await sleep(Math.min(waitSecs * 1000, 30_000));
      continue;
    }

    // 401 / 403 → bad token; 404 → model unavailable on free tier; fallback instead of crashing
    if (response.status === 401 || response.status === 403 || response.status === 404) {
      console.warn(`HuggingFace error ${response.status} — falling back to Pollinations.ai`);
      return pollinationsFallback(prompt);
    }

    // Any other error
    const errText = await response.text().catch(() => response.statusText);
    throw new Error(`HuggingFace API error ${response.status}: ${errText}`);
  }

  // Exhausted retries → fallback
  console.warn("HuggingFace model still loading after 3 attempts — falling back to Pollinations.ai");
  return pollinationsFallback(prompt);
};

async function pollinationsFallback(prompt: string): Promise<Blob> {
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&nologo=true&seed=${Math.floor(Math.random() * 1_000_000)}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Pollinations.ai failed with status ${res.status}`);
  }
  return res.blob();
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
