const MODEL_BASE_URL = process.env.MODEL_BASE_URL || 'http://127.0.0.1:11434/v1';
const MODEL_NAME = process.env.MODEL_NAME || 'qwen2.5:7b';

export async function summarizeEntry(rawText: string): Promise<string> {
  const prompt = `Summarize this personal health check-in in 2 short sentences. Do not diagnose.\n\n${rawText}`;

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 15_000);

  try {
    const response = await fetch(`${MODEL_BASE_URL}/chat/completions`, {
      method: 'POST',
      signal: ac.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL_NAME,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      throw new Error(`Model gateway returned ${response.status}`);
    }

    const data = await response.json() as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    return data.choices?.[0]?.message?.content?.trim() || 'Summary unavailable.';
  } catch {
    return 'Local model endpoint unavailable. Falling back to rule-based processing only.';
  } finally {
    clearTimeout(timer);
  }
}
