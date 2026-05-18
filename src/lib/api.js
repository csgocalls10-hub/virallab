const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '' : 'http://localhost:3001');

export async function fetchYouTubeMetadata(url) {
  const res = await fetch(`${API_URL}/api/youtube/metadata?url=${encodeURIComponent(url)}`);
  if (!res.ok) throw new Error('Erro ao buscar metadados do YouTube');
  return res.json();
}

export async function analyzeVideo(data) {
  const res = await fetch(`${API_URL}/api/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Erro na análise');
  return res.json();
}

export async function generateScript(data) {
  const res = await fetch(`${API_URL}/api/script`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Erro ao gerar roteiro');
  return res.json();
}

export function formatNumber(num) {
  if (!num) return '0';
  const n = parseInt(num);
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toString();
}

export function formatDuration(iso) {
  if (!iso) return '--:--';
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return iso;
  const h = match[1] ? match[1] + ':' : '';
  const m = (match[2] || '0').padStart(2, '0');
  const s = (match[3] || '0').padStart(2, '0');
  return `${h}${m}:${s}`;
}

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
