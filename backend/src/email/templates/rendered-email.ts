/**
 * What every template function in this directory returns. Text-only on
 * purpose — the `Email` the sender seam accepts has no HTML field (see
 * src/email/email-sender.ts).
 */
export interface RenderedEmail {
  subject: string;
  text: string;
}
