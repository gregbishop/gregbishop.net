import { getCollection } from 'astro:content';
import { homeText } from '../lib/screens.mjs';

export async function GET() {
  const posts = (await getCollection('posts', ({ data }) => !data.draft))
    .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
  return new Response(homeText(posts), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
