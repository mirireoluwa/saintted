export interface Track {
  id: number;
  title: string;
  slug: string;
  meta: string;
  art_url: string;
  link_url: string;
  order: number;
  description?: string;
  year?: number | null;
  youtube_url?: string;
  apple_music_url?: string;
  spotify_url?: string;
}
