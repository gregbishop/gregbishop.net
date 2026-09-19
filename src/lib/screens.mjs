// Shared copy and publication helpers for pages and explicit text resources.
export const SITE_NAME = 'gregbishop.net';
export const HOST = 'www.gregbishop.net';
export const ORIGIN = `https://${HOST}`;
export const TAGLINE = 'on purpose, mostly';
export const EMAIL = 'me@gregbishop.net';
export const GITHUB_URL = 'https://github.com/gregbishop';
export const MELAMPUS_URL = 'https://github.com/gregbishop/melampus';
// One source for the project page and explicit text resource.
export const MELAMPUS = {
  "tagline": "Species identification and photo triage for Lightroom Classic.",
  "intro": [
    "The camera records the bird. It does not record which bird. This leaves a surprising amount of clerical work for someone who thought they had gone outside.",
    "Melampus is an attempt to close that gap. It uses AI to identify species in photographs, assess technical quality, and bring the results into Adobe Lightroom Classic. Birds, mostly, though plants and other wildlife are also allowed to participate."
  ],
  "sections": [
    {
      "title": "What it does",
      "paragraphs": [
        "It looks at the photo and returns ranked species candidates with reasons for its choices. It can also check those candidates against occurrence data for the place and season. A plausible-looking bird still has to account for being in Florida.",
        "The quality checks measure sharpness on the subject. A beautifully resolved branch in front of a blurry bird is an achievement, but probably not the one you were after.",
        "The Lightroom plugin brings the results into the catalog for review, using keywords, ratings, flags, and color labels. Existing metadata is preserved. The years spent organizing a catalog do not need an AI-assisted sequel."
      ]
    },
    {
      "title": "Where it runs",
      "paragraphs": [
        "The default inference runs locally on an Apple Silicon Mac, using MLX. Your photos stay on your machine in that setup. Cloud inference is available as an explicit option, including for Windows; choosing it means sending images to the selected provider."
      ]
    },
    {
      "title": "How much to believe it",
      "paragraphs": [
        "It is a working project, with the emphasis distributed fairly evenly between those two words. The model can be wrong, and its confidence is not a promise. It can decline to identify something, which is a useful quality in both software and birders.",
        "The point is to make a large catalog easier to review. You still get the final say about the bird."
      ]
    },
    {
      "title": "The name",
      "paragraphs": [
        "Melampus was a Greek seer who could understand the speech of animals. This version reads JPEGs. Pronounced meh-LAM-pus."
      ]
    }
  ]
};

export const ABOUT = [
  "The plan is to be a homesteader. The current status is: software engineer.",
  "I've been writing code for twenty-some years and I'm currently spending most of that time on agentic AI tooling. Building it, then convincing several thousand coworkers to actually use it, which is the harder half. It's genuinely interesting work. It is also not homesteading.",
  "Meanwhile, on half an acre in Brevard County, the actual plan advances at its own pace. There's a food garden, which is real and has opinions about whether it wants to participate. A plant nursery is coming, natives mostly but not exclusively. Bees are coming after that. Aquaculture is coming after that. The timeline for \"coming\" is doing considerable work in all three of those sentences.",
  "So this site is the overlap: notes on building AI tools, notes on building a homestead, and the occasional observation that both are mostly the same activity, which is figuring out what a system actually needs versus what the documentation claims it needs.",
];

export const AUTHOR = 'Greg Bishop';
export const HOME_INTRO = [
  'I build agentic AI tools and am slowly turning half an acre in Brevard County into a homestead.',
  'The garden exists. The nursery, bees, and fish remain at various stages of “eventually.”',
];

export function publishedPosts(posts) {
  return posts.filter(({ data }) => !data.draft)
    .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

const dateFormatter = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
export const formatDate = (date) => dateFormatter.format(new Date(date));
export const isoDate = (date) => date.toISOString().slice(0, 10);
const text = (paragraphs) => paragraphs.filter(Boolean).join('\n\n') + '\n';

export function postsText(posts) {
  return text(posts.length ? posts.map((post) => [
    post.data.title, formatDate(post.data.date), post.data.blurb,
    `${ORIGIN}/posts/${post.id}/`,
  ].filter(Boolean).join('\n')) : ['No posts yet.']);
}

export function homeText(posts) {
  return text([AUTHOR, TAGLINE, ...HOME_INTRO,
    `Blog: ${ORIGIN}/posts/`, `About: ${ORIGIN}/about/`,
    `Melampus: ${ORIGIN}/melampus/`, 'Latest writing', postsText(posts).trimEnd(),
    `Email: ${EMAIL}`, `RSS: ${ORIGIN}/rss.xml`,
  ]);
}

export function aboutText() {
  return text([AUTHOR, ...ABOUT, `Email: ${EMAIL}`, `GitHub: ${GITHUB_URL}`]);
}

export function melampusText() {
  return text(['Melampus', MELAMPUS.tagline, ...MELAMPUS.intro,
    ...MELAMPUS.sections.flatMap((section) => [section.title, ...section.paragraphs]),
    MELAMPUS_URL,
  ]);
}
