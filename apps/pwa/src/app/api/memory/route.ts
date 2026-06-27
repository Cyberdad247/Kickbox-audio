import { promises as fs } from 'node:fs';
import path from 'node:path';
import { type NextRequest, NextResponse } from 'next/server';

interface MemoryEntry {
  line: number;
  text: string;
}

function getMemoryPaths() {
  const pwaDir = process.cwd(); // typically C:\Users\vizio\CAMELOT_OS\audit-kickbox-audio\apps\pwa
  const publicPath = path.join(pwaDir, 'public', 'memory.md');
  const rootPath = path.join(pwaDir, '..', '..', 'memory.md');
  return { publicPath, rootPath };
}

export async function GET() {
  const { publicPath } = getMemoryPaths();
  try {
    const fileContent = await fs.readFile(publicPath, 'utf-8');
    const lines = fileContent.split('\n');
    const entries: MemoryEntry[] = lines
      .map((text, idx) => ({ line: idx + 1, text }))
      .filter((e) => e.text.trim().startsWith('- ['));
    return NextResponse.json({ entries });
  } catch (error) {
    return NextResponse.json({ entries: [], error: String(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { publicPath, rootPath } = getMemoryPaths();
  try {
    const { text, date } = (await req.json()) as { text: string; date?: string };
    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }
    
    const formattedDate = date ?? new Date().toISOString().split('T')[0];
    const newLine = `- [${formattedDate}] ${text}`;
    
    // Append to public/memory.md
    let publicContent = await fs.readFile(publicPath, 'utf-8');
    if (!publicContent.endsWith('\n')) {
      publicContent += '\n';
    }
    publicContent += newLine + '\n';
    await fs.writeFile(publicPath, publicContent, 'utf-8');
    
    // Append to root memory.md if it exists
    try {
      let rootContent = await fs.readFile(rootPath, 'utf-8');
      if (!rootContent.endsWith('\n')) {
        rootContent += '\n';
      }
      rootContent += newLine + '\n';
      await fs.writeFile(rootPath, rootContent, 'utf-8');
    } catch {
      // Ignored if root file is missing
    }

    return NextResponse.json({ success: true, entry: newLine });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const { publicPath, rootPath } = getMemoryPaths();
  try {
    const { searchParams } = new URL(req.url);
    const lineStr = searchParams.get('line');
    if (!lineStr) {
      return NextResponse.json({ error: 'Line parameter is required' }, { status: 400 });
    }
    const lineToDeviate = Number(lineStr);

    const publicContent = await fs.readFile(publicPath, 'utf-8');
    const publicLines = publicContent.split('\n');
    
    if (lineToDeviate < 1 || lineToDeviate > publicLines.length) {
      return NextResponse.json({ error: 'Index out of bounds' }, { status: 400 });
    }

    const removedText = publicLines[lineToDeviate - 1];
    publicLines.splice(lineToDeviate - 1, 1);
    await fs.writeFile(publicPath, publicLines.join('\n'), 'utf-8');

    // Sync root memory.md by matching content
    try {
      const rootContent = await fs.readFile(rootPath, 'utf-8');
      const rootLines = rootContent.split('\n');
      const filteredRoot = rootLines.filter((l) => l !== removedText);
      await fs.writeFile(rootPath, filteredRoot.join('\n'), 'utf-8');
    } catch {
      // Ignored
    }

    return NextResponse.json({ success: true, removed: removedText });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
