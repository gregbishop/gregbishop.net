import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { publishedPosts } from '../lib/screens.mjs';

export async function GET(context) {
  const posts = publishedPosts(await getCollection('posts'));

  return rss({
    title: 'gregbishop.net',
    description: 'on purpose, mostly',
    site: context.site,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.blurb ?? '',
      pubDate: post.data.date,
      link: `/posts/${post.id}/`,
    })),
  });
}
