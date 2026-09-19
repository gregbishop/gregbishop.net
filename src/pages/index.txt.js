import { getCollection } from 'astro:content';
import { homeText, publishedPosts } from '../lib/screens.mjs';

export async function GET() {
  const posts = publishedPosts(await getCollection('posts'));
  return new Response(homeText(posts), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
