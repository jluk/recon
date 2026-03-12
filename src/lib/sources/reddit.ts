export interface RedditPost {
  id: string;
  title: string;
  selftext: string;
  author: string;
  score: number;
  numComments: number;
  subreddit: string;
  url: string;
  createdAt: string;
}

export interface RedditComment {
  id: string;
  body: string;
  author: string;
  score: number;
  subreddit: string;
  postTitle: string;
  createdAt: string;
}

export interface RedditResult {
  source: "reddit";
  queries: string[];
  subreddits: string[];
  posts: RedditPost[];
  comments: RedditComment[];
  fetchedAt: string;
}

const TARGET_SUBREDDITS = [
  "VideoEditing",
  "artificial",
  "StableDiffusion",
  "aivideo",
  "filmmakers",
  "vfx",
];

function stripMarkdown(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[*_~`#>]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchRedditJson(url: string): Promise<unknown | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Recon/1.0 (competitive intelligence tool)",
      },
    });

    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function searchSubreddit(
  subreddit: string,
  query: string,
  daysBack: number
): Promise<{ posts: RedditPost[]; comments: RedditComment[] }> {
  const posts: RedditPost[] = [];
  const comments: RedditComment[] = [];
  const cutoff = Date.now() / 1000 - daysBack * 86400;

  // Search posts in subreddit
  const searchUrl = `https://www.reddit.com/r/${subreddit}/search.json?q=${encodeURIComponent(
    query
  )}&restrict_sr=on&sort=new&limit=25&t=year`;

  const data = (await fetchRedditJson(searchUrl)) as {
    data?: { children?: { data: Record<string, unknown> }[] };
  } | null;

  if (!data?.data?.children) return { posts, comments };

  for (const child of data.data.children) {
    const post = child.data;
    const createdUtc = post.created_utc as number;
    if (createdUtc < cutoff) continue;

    const redditPost: RedditPost = {
      id: post.id as string,
      title: post.title as string,
      selftext: stripMarkdown(((post.selftext as string) ?? "").slice(0, 1000)),
      author: post.author as string,
      score: post.score as number,
      numComments: post.num_comments as number,
      subreddit,
      url: `https://reddit.com${post.permalink as string}`,
      createdAt: new Date(createdUtc * 1000).toISOString(),
    };
    posts.push(redditPost);

    // Fetch top comments for high-engagement posts
    if ((post.num_comments as number) > 3) {
      const commentsUrl = `https://www.reddit.com${post.permalink as string}.json?limit=15&sort=top`;
      const commentsData = (await fetchRedditJson(commentsUrl)) as
        | { data?: { children?: { data: Record<string, unknown> }[] } }[]
        | null;

      if (commentsData && Array.isArray(commentsData) && commentsData[1]?.data?.children) {
        for (const commentChild of commentsData[1].data.children) {
          if (commentChild.data?.body && commentChild.data?.author !== "AutoModerator") {
            comments.push({
              id: commentChild.data.id as string,
              body: stripMarkdown(((commentChild.data.body as string) ?? "").slice(0, 500)),
              author: commentChild.data.author as string,
              score: (commentChild.data.score as number) ?? 0,
              subreddit,
              postTitle: post.title as string,
              createdAt: new Date(((commentChild.data.created_utc as number) ?? 0) * 1000).toISOString(),
            });
          }
        }
      }

      // Be polite to Reddit's servers
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  return { posts, comments };
}

function getSearchVariants(name: string): string[] {
  const variants = new Set<string>();
  variants.add(name);
  const spaced = name.replace(/([a-z])([A-Z])/g, "$1 $2");
  if (spaced !== name) variants.add(spaced);
  const words = spaced.split(/\s+/);
  if (words.length > 1 && words[0].length >= 4) variants.add(words[0]);
  return Array.from(variants);
}

export async function fetchReddit(
  competitorName: string,
  daysBack: number = 90
): Promise<RedditResult> {
  const variants = getSearchVariants(competitorName);
  const seenPosts = new Set<string>();
  const seenComments = new Set<string>();
  const allPosts: RedditPost[] = [];
  const allComments: RedditComment[] = [];

  // Search each subreddit with each variant, but sequentially to respect rate limits
  for (const subreddit of TARGET_SUBREDDITS) {
    for (const query of variants) {
      const { posts, comments } = await searchSubreddit(subreddit, query, daysBack);

      for (const post of posts) {
        if (!seenPosts.has(post.id)) {
          seenPosts.add(post.id);
          allPosts.push(post);
        }
      }

      for (const comment of comments) {
        if (!seenComments.has(comment.id)) {
          seenComments.add(comment.id);
          allComments.push(comment);
        }
      }

      // Rate limit between requests
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  // Sort by score (most upvoted = most signal)
  allPosts.sort((a, b) => b.score - a.score);
  allComments.sort((a, b) => b.score - a.score);

  return {
    source: "reddit",
    queries: variants,
    subreddits: TARGET_SUBREDDITS,
    posts: allPosts,
    comments: allComments,
    fetchedAt: new Date().toISOString(),
  };
}
