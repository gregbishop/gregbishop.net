import { aboutText } from '../lib/screens.mjs';

export function GET() {
  return new Response(aboutText(), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
