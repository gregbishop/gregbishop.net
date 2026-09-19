import { getCollection } from 'astro:content';
import { postsText, publishedPosts } from '../lib/screens.mjs';

export async function GET() {
  const posts = publishedPosts(await getCollection('posts'));
  return new Response(postsText(posts), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
