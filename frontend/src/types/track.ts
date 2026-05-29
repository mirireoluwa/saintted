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
  /** Manually highlight this track on the home page as a featured/new release. */
  is_highlighted?: boolean;
  /** Upcoming track: shown separately in music section; detail page is full-screen countdown. */
  is_unreleased?: boolean;
  /** ISO datetime when the track drops (required when is_unreleased). */
  release_at?: string | null;
  /** Pre-save URL for unreleased detail page. */
  presave_url?: string;
  /** Present on GET /api/tracks/<slug>/ (detail); enables prev/next before the list loads. */
  previous_slug?: string | null;
  next_slug?: string | null;
  /** ISO datetime after which `is_highlighted` should be ignored (badge auto-expires). */
  highlighted_until?: string | null;
  /** ISO datetime when a draft track should auto-publish (server honours at request time). */
  publish_at?: string | null;
}
