// /posts/<name>.md: the post's markdown source, frontmatter included, for
// `cat posts/<name>.md` in the shell.
import { getCollection } from 'astro:content';
import { readFileSync } from 'node:fs';

export async function getStaticPaths() {
  const posts = await getCollection('posts', ({ data }) => !data.draft);
  return posts.map((post) => ({ params: { slug: post.id }, props: { post } }));
}

export function GET({ props }) {
  const { post } = props;
  const file = post.filePath ?? `src/content/posts/${post.id}.md`;
  return new Response(readFileSync(file, 'utf8'), { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } });
}
