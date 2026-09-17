// Regenerates src/data/banner.txt, the block-letter site name used by the
// home terminal and the curl version. Run: node scripts/banner.mjs
import figlet from 'figlet';
import { writeFileSync } from 'node:fs';

const text = figlet.textSync('gregbishop', { font: 'ANSI Shadow' });
const lines = text.split('\n').map((l) => l.replace(/\s+$/, ''));
while (lines.length && lines[lines.length - 1] === '') lines.pop();
writeFileSync(new URL('../src/data/banner.txt', import.meta.url), lines.join('\n') + '\n');
console.log(`banner: ${lines.length} lines, ${Math.max(...lines.map((l) => l.length))} columns`);
