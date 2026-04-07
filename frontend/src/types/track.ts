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
  /** Public API omits unpublished tracks; admin returns all. */
  is_published?: boolean;
  /** Upcoming track: shown separately in music section; detail page is full-screen countdown. */
  is_unreleased?: boolean;
  /** ISO datetime when the track drops (required when is_unreleased). */
  release_at?: string | null;
  /** Pre-save URL for unreleased detail page. */
  presave_url?: string;
  /** Present on GET /api/tracks/<slug>/ (detail); enables prev/next before the list loads. */
  previous_slug?: string | null;
  next_slug?: string | null;
}
