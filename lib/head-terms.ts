import path from 'path';
import { promises as fs } from 'fs';

type HeadTermPayload = {
  version: string;
  content: string;
};

let cachedTerm: HeadTermPayload | null = null;

export async function loadHeadTerm(): Promise<HeadTermPayload> {
  if (cachedTerm) return cachedTerm;

  const filePath = path.join(process.cwd(), 'content', 'terms', 'head_v1.1.md');
  const content = await fs.readFile(filePath, 'utf-8');
  const filename = path.basename(filePath);
  const versionMatch = filename.match(/head_v([\d.]+)\.md$/i);
  const version = versionMatch ? `v${versionMatch[1]}` : 'v1';

  cachedTerm = {
    version,
    content: content.trim(),
  };

  return cachedTerm;
}
