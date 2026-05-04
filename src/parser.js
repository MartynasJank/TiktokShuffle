export function parseBookmarks(data) {
  // Variant A — newer TikTok export
  const listA = data?.Activity?.['Favorite Videos']?.FavoriteVideoList;
  if (Array.isArray(listA) && listA.length) return listA;

  // Variant B — older TikTok export
  const listB = data?.Favorites?.FavoriteVideoList;
  if (Array.isArray(listB) && listB.length) return listB;

  // Fallback — shallow key walk for future export structure changes
  for (const topKey of Object.keys(data)) {
    const top = data[topKey];
    if (!top || typeof top !== 'object') continue;
    for (const midKey of Object.keys(top)) {
      const candidate = top[midKey]?.FavoriteVideoList;
      if (Array.isArray(candidate) && candidate.length) return candidate;
    }
  }

  return [];
}

export function extractVideoId(link) {
  const match = link?.match(/\/video\/(\d+)/);
  return match ? match[1] : null;
}

export async function fingerprintVideos(rawList) {
  const ids = rawList
    .map(item => extractVideoId(item.Link || item.link))
    .filter(Boolean)
    .sort()
    .join(',');
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(ids));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
