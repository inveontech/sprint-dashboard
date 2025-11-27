import { NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import path from 'path';

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
      if (!item.customer || typeof item.targetSP !== 'number') {
        return NextResponse.json(
          { error: 'Each customer must have a name and numeric targetSP' },
          { status: 400 }
        );
      }
    }

    // Sort by customer name
    const sortedData = data.sort((a, b) => a.customer.localeCompare(b.customer));

    // Write to both public and data folders
    const publicPath = path.join(process.cwd(), 'public', 'customer-targets.json');
    const dataPath = path.join(process.cwd(), 'data', 'customer-targets.json');
    
    const jsonContent = JSON.stringify(sortedData, null, 2);
    
    await writeFile(publicPath, jsonContent, 'utf-8');
    await writeFile(dataPath, jsonContent, 'utf-8');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to save customer targets:', error);
    return NextResponse.json(
      { error: 'Failed to save customer targets' },
      { status: 500 }
    );
  }
}
