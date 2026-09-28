export interface InsightsDay {
  date: string;
  visitors: number;
  pageviews: number;
}
export interface TrackInsight {
  slug: string;
  views: number;
  clicks: number;
  listens: Record<string, number>;
  listenTotal: number;
  presaves: number;
}
export interface Insights {
  days: number;
  series: InsightsDay[];
  totals: {
    visitors: number;
    pageviews: number;
    trackViews: number;
    trackClicks: number;
    listens: number;
    presaves: number;
    whatsapp: number;
    subscribes: number;
  };
  tracks: TrackInsight[];
  pages: { path: string; views: number }[];
  devices: { mobile: number; tablet: number; desktop: number };
  social: { label: string; clicks: number }[];
}
