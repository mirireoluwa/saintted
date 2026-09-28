export interface LiveShow {
  id: number;
  /** ISO datetime the show starts. */
  starts_at: string;
  /** Optional show title, shown above the venue. */
  title?: string;
  venue: string;
  city: string;
  ticket_url: string;
  note: string;
  is_sold_out: boolean;
  /** Optional flyer/poster image: the show story's background on the home page. */
  flyer_url?: string;
  created_at?: string;
}
