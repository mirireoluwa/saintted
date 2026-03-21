/**
 * When a track has no stored URL, open each platform’s search for
 * “Saintted” + track title so users land on real in-app results.
 * Replace with direct track/album links in Django admin when you have them.
 */
function searchQuery(trackTitle: string): string {
  return `Saintted ${trackTitle.trim()}`;
}

export function youtubeSearchUrl(trackTitle: string): string {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery(trackTitle))}`;
}

export function appleMusicSearchUrl(trackTitle: string): string {
  return `https://music.apple.com/us/search?term=${encodeURIComponent(searchQuery(trackTitle))}`;
}

export function spotifySearchUrl(trackTitle: string): string {
  return `https://open.spotify.com/search/${encodeURIComponent(searchQuery(trackTitle))}`;
}
