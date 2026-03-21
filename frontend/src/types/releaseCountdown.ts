export interface ReleaseCountdown {
  id: number;
  enabled: boolean;
  song_title: string;
  release_at: string | null;
  presave_url: string;
}
