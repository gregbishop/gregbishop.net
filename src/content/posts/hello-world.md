---
title: "starting this thing"
date: 2026-09-17
blurb: "Why there's a blog here now, and what's going to be on it."
tags: ["meta"]
draft: false
---

This is a placeholder post. Delete it, or edit it into something real.

It exists so you can see what a post looks like with actual formatting applied.

## how to write a new one

Make a file in `src/content/posts/`. Name it whatever you want the URL to be.
The frontmatter at the top is the only required part:

```markdown
---
title: "your title here"
date: 2026-09-20
blurb: "one line that shows on the homepage"
tags: ["agents", "homestead"]
draft: false
---

Then just write.
```

Set `draft: true` and the post disappears from the site until you flip it back.
Useful for things you're still chewing on.

## what formatting you get

Inline `code` works. So do lists:

- bullets render with a green dash
- nested emphasis like *this* and **this** works
- links look [like this](https://example.com)

Code blocks get syntax highlighting:

```java
public interface Tool {
    String name();
    JsonSchema schema();
    Result invoke(Args args, Ctx ctx);
}
```

> Blockquotes look like this, indented with a rule down the left side.

That's the whole system. Write markdown, commit, push, it's live.
