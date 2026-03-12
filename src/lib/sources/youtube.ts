export interface YouTubeVideo {
  id: string;
  title: string;
  channelTitle: string;
  publishedAt: string;
  viewCount: string;
  commentCount: string;
}

export interface YouTubeComment {
  id: string;
  text: string;
  author: string;
  likeCount: number;
  videoTitle: string;
  publishedAt: string;
}

export interface YouTubeResult {
  source: "youtube";
  queries: string[];
  videos: YouTubeVideo[];
  comments: YouTubeComment[];
  fetchedAt: string;
}

function getSearchVariants(name: string): string[] {
  const variants = new Set<string>();
  variants.add(name);
  const spaced = name.replace(/([a-z])([A-Z])/g, "$1 $2");
  if (spaced !== name) variants.add(spaced);
  return Array.from(variants);
}

async function searchVideos(
  query: string,
  apiKey: string,
  daysBack: number
): Promise<YouTubeVideo[]> {
  const publishedAfter = new Date(
    Date.now() - daysBack * 86400 * 1000
  ).toISOString();

  const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(
    query
  )}&type=video&order=relevance&maxResults=10&publishedAfter=${publishedAfter}&key=${apiKey}`;

  const res = await fetch(searchUrl);
  if (!res.ok) {
    console.error("YouTube search failed:", res.status, await res.text());
    return [];
  }

  const data = await res.json();
  if (!data.items?.length) return [];

  // Get video stats
  const videoIds = data.items.map((item: { id: { videoId: string } }) => item.id.videoId).join(",");
  const statsUrl = `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${videoIds}&key=${apiKey}`;
  const statsRes = await fetch(statsUrl);
  const statsData = statsRes.ok ? await statsRes.json() : { items: [] };

  const statsMap = new Map<string, { viewCount: string; commentCount: string }>();
  for (const item of statsData.items ?? []) {
    statsMap.set(item.id, {
      viewCount: item.statistics?.viewCount ?? "0",
      commentCount: item.statistics?.commentCount ?? "0",
    });
  }

  return data.items.map(
    (item: { id: { videoId: string }; snippet: { title: string; channelTitle: string; publishedAt: string } }) => {
      const stats = statsMap.get(item.id.videoId);
      return {
        id: item.id.videoId,
        title: item.snippet.title,
        channelTitle: item.snippet.channelTitle,
        publishedAt: item.snippet.publishedAt,
        viewCount: stats?.viewCount ?? "0",
        commentCount: stats?.commentCount ?? "0",
      };
    }
  );
}

async function fetchVideoComments(
  videoId: string,
  videoTitle: string,
  apiKey: string
): Promise<YouTubeComment[]> {
  const url = `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${videoId}&maxResults=25&order=relevance&key=${apiKey}`;

  const res = await fetch(url);
  if (!res.ok) return [];

  const data = await res.json();
  if (!data.items?.length) return [];

  return data.items.map(
    (item: {
      id: string;
      snippet: {
        topLevelComment: {
          snippet: {
            textDisplay: string;
            authorDisplayName: string;
            likeCount: number;
            publishedAt: string;
          };
        };
      };
    }) => ({
      id: item.id,
      text: item.snippet.topLevelComment.snippet.textDisplay
        .replace(/<[^>]*>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 500),
      author: item.snippet.topLevelComment.snippet.authorDisplayName,
      likeCount: item.snippet.topLevelComment.snippet.likeCount ?? 0,
      videoTitle,
      publishedAt: item.snippet.topLevelComment.snippet.publishedAt,
    })
  );
}

export async function fetchYouTube(
  competitorName: string,
  apiKey: string,
  daysBack: number = 90
): Promise<YouTubeResult> {
  const variants = getSearchVariants(competitorName);

  // Search for videos across all variants
  const seenVideos = new Set<string>();
  const allVideos: YouTubeVideo[] = [];

  for (const query of variants) {
    const videos = await searchVideos(query, apiKey, daysBack);
    for (const video of videos) {
      if (!seenVideos.has(video.id)) {
        seenVideos.add(video.id);
        allVideos.push(video);
      }
    }
  }

  // Fetch comments for videos that have them (limit to top 5 by view count)
  const videosWithComments = allVideos
    .filter((v) => parseInt(v.commentCount) > 0)
    .sort((a, b) => parseInt(b.viewCount) - parseInt(a.viewCount))
    .slice(0, 5);

  const allComments: YouTubeComment[] = [];
  for (const video of videosWithComments) {
    const comments = await fetchVideoComments(video.id, video.title, apiKey);
    allComments.push(...comments);
  }

  return {
    source: "youtube",
    queries: variants,
    videos: allVideos,
    comments: allComments,
    fetchedAt: new Date().toISOString(),
  };
}
