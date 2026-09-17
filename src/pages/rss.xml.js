import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';

export async function GET(context) {
  const posts = (await getCollection('posts', ({ data }) => !data.draft))
    .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());

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
