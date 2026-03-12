export interface HNItem {
  objectID: string;
  title: string | null;
  url: string | null;
  author: string;
  points: number | null;
  num_comments: number | null;
  comment_text: string | null;
  story_title: string | null;
  created_at: string;
}

export interface HNResult {
  source: "hackernews";
  queries: string[];
  stories: {
    id: string;
    title: string;
    url: string | null;
    author: string;
    points: number;
    numComments: number;
    createdAt: string;
  }[];
  comments: {
    id: string;
    text: string;
    author: string;
    storyTitle: string;
    createdAt: string;
  }[];
  fetchedAt: string;
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Generate search variants for a competitor name.
 * "RunwayML" -> ["RunwayML", "Runway ML", "Runway"]
 * "Pika Labs" -> ["Pika Labs", "PikaLabs", "Pika"]
 */
function getSearchVariants(name: string): string[] {
  const variants = new Set<string>();

  // Original name
  variants.add(name);

  // Split camelCase / PascalCase: "RunwayML" -> "Runway ML"
  const spaced = name.replace(/([a-z])([A-Z])/g, "$1 $2");
  if (spaced !== name) variants.add(spaced);

  // Remove spaces: "Pika Labs" -> "PikaLabs"
  const noSpaces = name.replace(/\s+/g, "");
  if (noSpaces !== name) variants.add(noSpaces);

  // First word only (if multi-word): "Runway ML" -> "Runway", "Pika Labs" -> "Pika"
  const words = spaced.split(/\s+/);
  if (words.length > 1 && words[0].length >= 4) {
    variants.add(words[0]);
  }

  // Lowercase variants
  const lower = name.toLowerCase();
  variants.add(lower);

  return Array.from(variants);
}

async function fetchForQuery(
  query: string,
  timestamp: number
): Promise<{ stories: HNItem[]; comments: HNItem[] }> {
  const [storiesRes, commentsRes] = await Promise.all([
    fetch(
      `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(
        query
      )}&tags=story&numericFilters=created_at_i>${timestamp}&hitsPerPage=30`
    ),
    fetch(
      `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(
        query
      )}&tags=comment&numericFilters=created_at_i>${timestamp}&hitsPerPage=100`
    ),
  ]);

  if (!storiesRes.ok || !commentsRes.ok) {
    throw new Error(
      `HN API error: stories=${storiesRes.status}, comments=${commentsRes.status}`
    );
  }

  const storiesData = await storiesRes.json();
  const commentsData = await commentsRes.json();

  return {
    stories: storiesData.hits as HNItem[],
    comments: commentsData.hits as HNItem[],
  };
}

export async function fetchHackerNews(
  competitorName: string,
  daysBack: number = 90
): Promise<HNResult> {
  const timestamp = Math.floor(Date.now() / 1000) - daysBack * 86400;
  const variants = getSearchVariants(competitorName);

  // Fetch all variants in parallel
  const results = await Promise.all(
    variants.map((q) => fetchForQuery(q, timestamp))
  );

  // Deduplicate by objectID
  const seenStories = new Set<string>();
  const seenComments = new Set<string>();

  const stories: HNResult["stories"] = [];
  const comments: HNResult["comments"] = [];

  for (const result of results) {
    for (const hit of result.stories) {
      if (!seenStories.has(hit.objectID)) {
        seenStories.add(hit.objectID);
        stories.push({
          id: hit.objectID,
          title: hit.title ?? "",
          url: hit.url,
          author: hit.author,
          points: hit.points ?? 0,
          numComments: hit.num_comments ?? 0,
          createdAt: hit.created_at,
        });
      }
    }

    for (const hit of result.comments) {
      if (hit.comment_text && !seenComments.has(hit.objectID)) {
        seenComments.add(hit.objectID);
        comments.push({
          id: hit.objectID,
          text: stripHtml(hit.comment_text),
          author: hit.author,
          storyTitle: hit.story_title ?? "",
          createdAt: hit.created_at,
        });
      }
    }
  }

  // Sort by recency
  stories.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  comments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return {
    source: "hackernews",
    queries: variants,
    stories,
    comments,
    fetchedAt: new Date().toISOString(),
  };
}
