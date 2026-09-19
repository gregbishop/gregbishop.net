// The index the in-page shell loads: every post's frontmatter, nothing else.
import { getCollection } from 'astro:content';
import { publishedPosts } from '../lib/screens.mjs';

export async function GET() {
  const posts = publishedPosts(await getCollection('posts'))
    .map((p) => ({
      id: p.id,
      data: {
        title: p.data.title,
        date: p.data.date.toISOString().slice(0, 10),
        blurb: p.data.blurb ?? '',
        tags: p.data.tags,
      },
    }));
  return new Response(JSON.stringify({ posts }), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
}
