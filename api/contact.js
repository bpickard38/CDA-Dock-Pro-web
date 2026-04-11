/**
 * CDA Dock Pro — /api/contact
 * Vercel serverless function: receives general contact form submissions.
 *
 * Required environment variable (set in Vercel dashboard):
 *   RESEND_API_KEY  — your Resend API key (re_xxxxxxxxxxxx)
 */

const NOTIFY_EMAIL = 'bpickard38@gmail.com';

const LAKE_LABELS = {
  cda:    "Lake Coeur d'Alene",
  hayden: 'Hayden Lake',
  twin:   'Twin Lakes',
  spirit: 'Spirit Lake',
  other:  'Other / Not Sure',
};

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, email, phone, lake, message } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required.' });
  }

  const lakeLabel = LAKE_LABELS[lake] || lake || '—';

  const html = `
    <div style="font-family: -apple-system, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0;">

      <div style="background: #0A1628; padding: 24px 32px;">
        <h1 style="margin: 0; color: #ffffff; font-size: 20px;">⚓ New Contact Message</h1>
        <p style="margin: 6px 0 0; color: rgba(255,255,255,0.65); font-size: 14px;">CDA Dock Pro LLC</p>
      </div>

      <div style="padding: 24px 32px 0;">
        <h2 style="margin: 0 0 16px; font-size: 15px; color: #0A1628; text-transform: uppercase; letter-spacing: 0.06em; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px;">Contact Info</h2>
        <table style="width: 100%; border-collapse: collapse; font-size: 15px;">
          <tr>
            <td style="padding: 6px 0; color: #718096; width: 130px;">Name</td>
            <td style="padding: 6px 0; color: #0A1628; font-weight: 600;">${name}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #718096;">Email</td>
            <td style="padding: 6px 0;"><a href="mailto:${email}" style="color: #2B6CB0;">${email}</a></td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #718096;">Phone</td>
            <td style="padding: 6px 0;">${phone ? `<a href="tel:${phone}" style="color: #2B6CB0;">${phone}</a>` : '—'}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #718096;">Lake</td>
            <td style="padding: 6px 0; color: #0A1628; font-weight: 600;">${lakeLabel}</td>
          </tr>
        </table>
      </div>

      ${message ? `
      <div style="padding: 24px 32px 0;">
        <h2 style="margin: 0 0 12px; font-size: 15px; color: #0A1628; text-transform: uppercase; letter-spacing: 0.06em; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px;">Message</h2>
        <p style="margin: 0; color: #4A5568; font-size: 15px; line-height: 1.6; white-space: pre-line;">${message}</p>
      </div>` : ''}

      <div style="padding: 24px 32px 32px; margin-top: 8px;">
        <a href="mailto:${email}?subject=Re: Your CDA Dock Pro Inquiry&body=Hi ${name}," style="display: inline-block; background: #2B6CB0; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 15px;">Reply to ${name} →</a>
      </div>

      <div style="background: #e2e8f0; padding: 12px 32px; text-align: center;">
        <p style="margin: 0; font-size: 12px; color: #718096;">CDA Dock Pro LLC · Coeur d'Alene, Idaho · cdadockpro.com</p>
      </div>

    </div>
  `;

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'CDA Dock Pro <leads@cdadockpro.com>',
        to:   [NOTIFY_EMAIL],
        reply_to: email,
        subject: `New Message — ${name} · ${lakeLabel}`,
        html,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Resend error:', err);
      return res.status(500).json({ error: 'Failed to send email.' });
    }

    return res.status(200).json({ success: true });

  } catch (err) {
    console.error('Handler error:', err);
    return res.status(500).json({ error: 'Server error.' });
  }
}
