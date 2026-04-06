export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

export class ModelGateway {
  constructor(
    private readonly baseUrl: string,
    private readonly apiKey: string,
    private readonly model: string,
  ) {}

  async summarizeHealthEntry(rawText: string): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          temperature: 0.2,
          messages: [
            { role: 'system', content: 'Summarise a health journal entry in 2 concise sentences. Do not diagnose.' },
            { role: 'user', content: rawText }
          ]
        })
      });

      if (!response.ok) {
        return 'Local model endpoint unavailable. Summary skipped.';
      }

      const data = await response.json() as any;
      return data?.choices?.[0]?.message?.content?.trim() || 'No summary returned.';
    } catch {
      return 'Local model endpoint unavailable. Summary skipped.';
    }
  }
}
