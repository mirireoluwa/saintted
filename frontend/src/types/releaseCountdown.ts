export interface ReleaseCountdown {
  id: number;
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
