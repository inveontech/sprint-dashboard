import OpenAI from 'openai';

export class ClaudeClient {
  private client: OpenAI;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error(
        'OPENAI_API_KEY environment variable is required for AI analysis.\n' +
        'Please add OPENAI_API_KEY to your .env file.\n' +
        'Get your API key from: https://platform.openai.com/api-keys'
      );
    }

    this.client = new OpenAI({
      apiKey,
    });
  }

  async analyzeSprintMetrics(metrics: any) {
    const prompt = `
Aşağıdaki sprint metriklerini analiz et ve öneriler sun:

${JSON.stringify(metrics, null, 2)}

Lütfen şunları değerlendir:
1. Velocity trend'i
2. Completion rate
3. Bug sayıları
4. İyileştirme önerileri

Kısa ve öz bir analiz yap (max 300 kelime), Türkçe olsun.
`;

    const completion = await this.client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 1024,
      temperature: 0.7,
    });

    return completion.choices[0]?.message?.content || '';
  }
}

