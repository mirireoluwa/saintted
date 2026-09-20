export interface AboutContent {
  id: number;
  heading: string;
  /** Optional bio; blank lines separate paragraphs. */
  body: string;
  booking_email: string;
  /** Absolute URL of the uploaded portrait, or "" to use the site default. */
  portrait_url: string;
  updated_at?: string;
}

/** Shown until the API responds (or if it can't be reached). */
export const DEFAULT_ABOUT: AboutContent = {
  id: 1,
  heading: "free like a hummingbird",
  body: "",
  booking_email: "beingsaintted@gmail.com",
  portrait_url: "",
};
