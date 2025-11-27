import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sprint, previousSprints } = body;

    // Validate required fields
    if (!sprint || !sprint.name || !sprint.metrics) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request body. Sprint name and metrics are required.',
        },
        { status: 400 }
      );
    }

    // Check API key
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error: 'OPENAI_API_KEY environment variable is not configured.',
        },
        { status: 500 }
      );
    }

    const client = new OpenAI({
      apiKey,
    });

    // Build detailed prompt
    let prompt = `Inveon inCommerce ekibinin detaylı sprint analizi:\n\n`;
    prompt += `## Sprint Bilgileri\n`;
    prompt += `Sprint: ${sprint.name}\n`;
    prompt += `Toplam İş: ${sprint.totalIssues || 0} issue\n`;
    prompt += `Tamamlanan: ${sprint.metrics.completedPoints} / ${sprint.metrics.totalPoints} SP\n`;
    prompt += `Başarı Oranı: ${sprint.metrics.completionRate}%\n`;
    prompt += `Bug Sayısı: ${sprint.metrics.bugCount}\n\n`;

    // Add issue type breakdown
    if (sprint.issuesByType && Object.keys(sprint.issuesByType).length > 0) {
      prompt += `## Issue Tipleri:\n`;
      Object.entries(sprint.issuesByType).forEach(([type, count]) => {
        prompt += `- ${type}: ${count} adet\n`;
      });
      prompt += `\n`;
    }

    // Add customer breakdown
    if (sprint.issuesByCustomer && Object.keys(sprint.issuesByCustomer).length > 0) {
      prompt += `## Marka Bazında Analiz:\n`;
      Object.entries(sprint.issuesByCustomer).forEach(([customer, data]: [string, any]) => {
        prompt += `${customer}:\n`;
        prompt += `  - Toplam İş: ${data.total}\n`;
        prompt += `  - Tamamlanan: ${data.done} (${Math.round((data.done/data.total)*100)}%)\n`;
        if (data.bugs > 0) {
          prompt += `  - Bug: ${data.bugs} adet\n`;
        }
        if (data.secondLevel > 0) {
          prompt += `  - Second Level Support: ${data.secondLevel} adet\n`;
        }
        prompt += `\n`;
      });
    }

    // Add trend information if previous sprints are provided
    if (previousSprints && Array.isArray(previousSprints) && previousSprints.length > 0) {
      prompt += `## Önceki Sprint Performansı:\n`;
      previousSprints.forEach((prev: any, index: number) => {
        prompt += `${index + 1}. ${prev.name || 'Sprint'}: ${prev.metrics?.completedPoints || 0} SP, ${prev.metrics?.completionRate || 0}% başarı\n`;
      });
      prompt += `\n`;
    }

    prompt += `## Analiz İste:\n`;
    prompt += `1. **Sprint Performansı Değerlendirmesi**: Genel başarı durumu ve öne çıkan noktalar\n`;
    prompt += `2. **Dikkat Çeken Sorunlar**: \n`;
    prompt += `   - Bug oranı yüksek olan markalar varsa neden yüksek olabilir?\n`;
    prompt += `   - Second Level Support işleri neden artıyor olabilir?\n`;
    prompt += `   - Hangi issue tiplerinde yığılma var?\n`;
    prompt += `3. **Marka Bazlı Gözlemler**: Hangi markalarda ne tür sorunlar öne çıkıyor?\n`;
    prompt += `4. **Öneriler**: Bir sonraki sprint için 3 somut iyileştirme önerisi\n\n`;
    prompt += `Lütfen detaylı ama öz bir analiz yap (300-400 kelime). Türkçe yaz ve markdown formatını kullan.`;

    // Call OpenAI API
    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 2048,
      temperature: 0.7,
    });

    const analysis = completion.choices[0]?.message?.content || '';

    if (!analysis) {
      return NextResponse.json(
        {
          success: false,
          error: 'OpenAI API returned empty response.',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      analysis,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('OpenAI API Error:', error);

    // Handle specific OpenAI API errors
    if (error.status === 401) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid API key. Please check OPENAI_API_KEY.',
        },
        { status: 401 }
      );
    }

    if (error.status === 429) {
      return NextResponse.json(
        {
          success: false,
          error: 'Rate limit exceeded. Please try again later.',
        },
        { status: 429 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to analyze sprint metrics',
      },
      { status: 500 }
    );
  }
}
