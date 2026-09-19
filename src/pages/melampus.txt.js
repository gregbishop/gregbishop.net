import { melampusText } from '../lib/screens.mjs';

export function GET() {
  return new Response(melampusText(), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
