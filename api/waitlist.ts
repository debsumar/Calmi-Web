import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * POST /api/waitlist
 *
 * Saves the email to a Brevo list and sends a welcome mail.
 * Runs only on the server: the Brevo API key is read from Vercel
 * environment variables and never reaches the browser bundle.
 */

const BREVO_BASE = 'https://api.brevo.com/v3';
const UPSTREAM_TIMEOUT_MS = 5000;
const MAX_EMAIL_LENGTH = 254;

/** Practical shape check. Deliberately permissive; Brevo is the final authority. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

interface WaitlistResponse {
  success: boolean;
  message?: string;
}

interface BrevoConfig {
  apiKey: string;
  listId: number;
  senderEmail: string;
  senderName: string;
}

function readConfig(): BrevoConfig | null {
  const apiKey = process.env['BREVO_API_KEY'];
  const listId = Number(process.env['BREVO_LIST_ID']);
  const senderEmail = process.env['BREVO_SENDER_EMAIL'];
  const senderName = process.env['BREVO_SENDER_NAME'] ?? 'Calmi';

  if (!apiKey || !senderEmail || !Number.isInteger(listId) || listId <= 0) {
    return null;
  }
  return { apiKey, listId, senderEmail, senderName };
}

async function brevoFetch(path: string, apiKey: string, body: unknown): Promise<Response> {
  return fetch(`${BREVO_BASE}${path}`, {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
  });
}

/**
 * Adds the contact to the waitlist list.
 * `updateEnabled: true` makes a resubmit idempotent instead of a hard error.
 * Returns true when the contact is on the list, including the duplicate case.
 */
async function addContact(email: string, config: BrevoConfig): Promise<boolean> {
  const response = await brevoFetch('/contacts', config.apiKey, {
    email,
    listIds: [config.listId],
    updateEnabled: true,
  });

  if (response.ok) {
    return true;
  }

  // Brevo answers 400 duplicate_parameter when the contact already exists.
  if (response.status === 400) {
    const detail = (await response.json().catch(() => null)) as { code?: string } | null;
    if (detail?.code === 'duplicate_parameter') {
      return true;
    }
  }

  console.error('brevo_add_contact_failed', { status: response.status });
  return false;
}

/**
 * Sends the welcome mail. Failure here is logged but not fatal:
 * the lead is already stored, so the user should still see success.
 */
async function sendWelcomeEmail(email: string, config: BrevoConfig): Promise<void> {
  try {
    const response = await brevoFetch('/smtp/email', config.apiKey, {
      sender: { email: config.senderEmail, name: config.senderName },
      to: [{ email }],
      subject: "You're on the Calmi waitlist",
      htmlContent:
        '<p>Thanks for joining the Calmi waitlist.</p>' +
        "<p>We'll email you as soon as early access opens.</p>" +
        '<p>— The Calmi team</p>',
    });

    if (!response.ok) {
      console.error('brevo_send_email_failed', { status: response.status });
    }
  } catch {
    console.error('brevo_send_email_error');
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ success: false, message: 'Method not allowed.' } satisfies WaitlistResponse);
    return;
  }

  const body = (typeof req.body === 'string' ? safeParse(req.body) : req.body) as
    | { email?: unknown; website?: unknown }
    | null;

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    res.status(400).json({ success: false, message: 'Invalid request.' } satisfies WaitlistResponse);
    return;
  }

  // Honeypot: bots fill hidden fields. Answer normally, contact Brevo not at all.
  if (typeof body.website === 'string' && body.website.trim() !== '') {
    res.status(200).json({ success: true, message: "You're on the list." } satisfies WaitlistResponse);
    return;
  }

  const email = typeof body.email === 'string' ? body.email.trim() : '';

  if (email.length === 0 || email.length > MAX_EMAIL_LENGTH || !EMAIL_PATTERN.test(email)) {
    res
      .status(400)
      .json({ success: false, message: 'Enter a valid email address.' } satisfies WaitlistResponse);
    return;
  }

  const config = readConfig();
  if (!config) {
    // Missing env vars must never look like a successful signup.
    console.error('waitlist_config_missing');
    res
      .status(503)
      .json({ success: false, message: 'Waitlist is unavailable. Try again later.' } satisfies WaitlistResponse);
    return;
  }

  try {
    const stored = await addContact(email, config);

    if (!stored) {
      res
        .status(502)
        .json({ success: false, message: 'Could not join right now. Try again later.' } satisfies WaitlistResponse);
      return;
    }

    await sendWelcomeEmail(email, config);

    res.status(200).json({
      success: true,
      message: "You're on the list. Check your inbox for a confirmation.",
    } satisfies WaitlistResponse);
  } catch {
    // Never surface upstream detail or the submitted address.
    console.error('waitlist_upstream_error');
    res
      .status(502)
      .json({ success: false, message: 'Could not join right now. Try again later.' } satisfies WaitlistResponse);
  }
}

function safeParse(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
