import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { DEFAULT_CLIPS } from '../src/avatar/defaultClips';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const signsDir = path.resolve(__dirname, '../public/signs');
if (!fs.existsSync(signsDir)) {
  fs.mkdirSync(signsDir, { recursive: true });
}

const manifestPath = path.join(signsDir, 'manifest.json');
let manifest = {
  version: 1,
  updatedAt: new Date().toISOString(),
  signs: {} as Record<string, any>,
};

console.log('Exporting clips count:', Object.keys(DEFAULT_CLIPS).length);

for (const [signId, clip] of Object.entries(DEFAULT_CLIPS)) {
  const fileName = `${signId}.json`;
  const filePath = path.join(signsDir, fileName);
  fs.writeFileSync(filePath, JSON.stringify(clip, null, 2), 'utf-8');
  manifest.signs[signId] = {
    file: fileName,
    language: clip.language,
    verified: clip.verified,
    author: clip.author,
  };
  console.log(`Saved ${signId} -> ${fileName} (${clip.frames.length} frames)`);
}

manifest.updatedAt = new Date().toISOString();
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
console.log('Saved manifest.json with', Object.keys(manifest.signs).length, 'signs!');
