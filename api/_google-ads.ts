/**
 * Server-side Google Ads conversion — deliberately a gated stub for v1.
 *
 * v1 fires the Ads conversion client-side via gtag (src/gtag.ts), which
 * is the standard, sufficient approach. A true server-side conversion
 * needs either the Google Ads API (developer token + OAuth) or offline
 * conversion import — out of scope here. The env contract + call site are
 * in place so this can be implemented later with no caller change.
 *
 * Enable later with GOOGLE_ADS_CONVERSION_ENABLED=true once implemented.
 */

const ENABLED = process.env.GOOGLE_ADS_CONVERSION_ENABLED === 'true';

export interface GoogleAdsConversionInput {
  kind: 'lead' | 'schedule';
  gclid?: string;
  email?: string;
  phone?: string;
}

export async function fireGoogleAdsConversion(
  _input: GoogleAdsConversionInput,
): Promise<void> {
  if (!ENABLED) return; // intentional no-op in v1
  // Placeholder: Google Ads API offline click conversion upload goes here.
  // Left unimplemented on purpose — see file header.
}
