// /posts/<name>.md: the post's Markdown source, frontmatter included,
// linked from each article.
import { getCollection } from 'astro:content';
import { publishedPosts } from '../../lib/screens.mjs';
import { readFileSync } from 'node:fs';

export async function getStaticPaths() {
  const posts = publishedPosts(await getCollection('posts'));
  return posts.map((post) => ({ params: { slug: post.id }, props: { post } }));
}

export function GET({ props }) {
  const { post } = props;
  const file = post.filePath ?? `src/content/posts/${post.id}.md`;
  return new Response(readFileSync(file, 'utf8'), { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } });
}
