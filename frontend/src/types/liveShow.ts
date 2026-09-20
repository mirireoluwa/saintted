export interface LiveShow {
  id: number;
  /** ISO datetime the show starts. */
  starts_at: string;
  venue: string;
  city: string;
  ticket_url: string;
  note: string;
  is_sold_out: boolean;
  created_at?: string;
}
