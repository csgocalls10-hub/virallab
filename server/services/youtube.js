import fetch from 'node-fetch';

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

export function extractVideoId(url) {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

export async function getVideoMetadata(url) {
  const videoId = extractVideoId(url);
  if (!videoId) throw new Error('URL do YouTube inválida');

  const apiUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=${videoId}&key=${YOUTUBE_API_KEY}`;
  const res = await fetch(apiUrl);
  const data = await res.json();

  if (!data.items || data.items.length === 0) throw new Error('Vídeo não encontrado');

  const item = data.items[0];
  return {
    videoId,
    title: item.snippet.title,
    description: item.snippet.description?.substring(0, 500),
    channelTitle: item.snippet.channelTitle,
    publishedAt: item.snippet.publishedAt,
    thumbnail: item.snippet.thumbnails?.maxres?.url || item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.medium?.url,
    viewCount: item.statistics.viewCount,
    likeCount: item.statistics.likeCount,
    commentCount: item.statistics.commentCount,
    duration: item.contentDetails.duration,
    tags: item.snippet.tags?.slice(0, 10) || [],
  };
}
