import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

// GET: Retrieve saved sprint targets
export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'data', 'sprint-targets.json');
    const data = await fs.readFile(filePath, 'utf-8');
    const targets = JSON.parse(data);
    
    return NextResponse.json({ success: true, targets });
  } catch (error) {
    console.error('Error reading sprint targets:', error);
    return NextResponse.json({ success: true, targets: [] });
  }
}

// POST: Save or update sprint target
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sprintId, sprintName, targetPoints, customers, savedAt, deleteMode, targets: bulkTargets } = body;

    const dataPath = path.join(process.cwd(), 'data', 'sprint-targets.json');
    const publicPath = path.join(process.cwd(), 'public', 'sprint-targets.json');

    // Delete mode: directly write provided targets array
    if (deleteMode && bulkTargets) {
      const jsonData = JSON.stringify(bulkTargets, null, 2);
      await fs.writeFile(dataPath, jsonData);
      await fs.writeFile(publicPath, jsonData);
      console.log('Sprint targets updated (delete operation)');
      return NextResponse.json({ success: true, message: 'Sprint targets updated' });
    }

    // Normal save/update mode
    if (!sprintId || targetPoints === undefined) {
      return NextResponse.json(
        { success: false, error: 'sprintId and targetPoints are required' },
        { status: 400 }
      );
    }
    
    // Read existing targets
    let targets = [];
    try {
      const data = await fs.readFile(dataPath, 'utf-8');
      targets = JSON.parse(data);
    } catch {
      targets = [];
    }

    // Check if sprint target already exists
    const existingIndex = targets.findIndex((t: any) => t.sprintId === sprintId);
    
    const targetEntry = {
      sprintId,
      sprintName,
      targetPoints,
      customers: customers || [],
      savedAt: savedAt || new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      // Update existing
      targets[existingIndex] = targetEntry;
    } else {
      // Add new
      targets.push(targetEntry);
    }

    // Sort by sprint ID descending (newest first)
    targets.sort((a: any, b: any) => b.sprintId - a.sprintId);

    // Write to both locations
    const jsonData = JSON.stringify(targets, null, 2);
    await fs.writeFile(dataPath, jsonData);
    await fs.writeFile(publicPath, jsonData);

    console.log(`Sprint target saved: ${sprintName} (ID: ${sprintId}) = ${targetPoints} SP`);

    return NextResponse.json({ 
      success: true, 
      message: 'Sprint target saved successfully',
      target: targetEntry 
    });
  } catch (error: any) {
    console.error('Error saving sprint target:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to save sprint target' },
      { status: 500 }
    );
  }
}
