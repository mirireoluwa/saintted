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
  is_published: boolean;
  is_highlighted: boolean;
  is_unreleased: boolean;
  release_at?: string | null;
  presave_url?: string;
  release_email_sent?: boolean;
  /** ISO datetime after which is_highlighted should be ignored (auto-expires). */
  highlighted_until?: string | null;
  /** ISO datetime when a draft track should auto-publish. */
  publish_at?: string | null;
}

export interface FeaturedVideo {
  id: number;
  title: string;
  youtube_id: string;
  order: number;
}

export interface GalleryImage {
  id: number;
  image: string;
  image_url: string;
  caption: string;
  order: number;
  created_at: string;
}

export interface ReleaseCountdown {
  id: 1;
  enabled: boolean;
  song_title: string;
  release_at: string | null;
  presave_url: string;
  header_image_url: string;
  header_image_crop: "center" | "top" | "bottom" | "left" | "right";
  header_image_file_url: string;
  header_image_focus_x: number;
  header_image_focus_y: number;
  header_video_url: string;
  header_video_file_url: string;
}

export interface Subscriber {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  subscribed_at: string;
}

export interface PendingSubscriber {
  token: string;
  first_name: string;
  last_name: string;
  email: string;
  created_at: string;
}

export const DEFAULT_COUNTDOWN: ReleaseCountdown = {
  id: 1,
  enabled: false,
  song_title: "",
  release_at: null,
  presave_url: "",
  header_image_url: "",
  header_image_crop: "center",
  header_image_file_url: "",
  header_image_focus_x: 50,
  header_image_focus_y: 50,
  header_video_url: "",
  header_video_file_url: "",
};
