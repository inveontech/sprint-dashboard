import { NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    // Validate data
    if (!Array.isArray(data)) {
      return NextResponse.json(
        { error: 'Invalid data format' },
        { status: 400 }
      );
    }

    // Validate each entry
    for (const item of data) {
      if (!item.name || typeof item.target !== 'number') {
        return NextResponse.json(
          { error: 'Each developer must have a name and numeric target' },
          { status: 400 }
        );
      }
    }

    // Sort by name
    const sortedData = data.sort((a, b) => a.name.localeCompare(b.name));

    // Write to public folder
    const filePath = path.join(process.cwd(), 'public', 'developer-targets.json');
    await writeFile(filePath, JSON.stringify(sortedData, null, 2), 'utf-8');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to save developer targets:', error);
    return NextResponse.json(
      { error: 'Failed to save developer targets' },
      { status: 500 }
    );
  }
}
