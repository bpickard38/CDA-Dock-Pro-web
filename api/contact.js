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

const { escapeHtml, validateSubmission, isSpam } = require('./_utils');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Bots fill the hidden honeypot field — pretend success so they move on
  if (isSpam(req.body)) {
    return res.status(200).json({ success: true });
  }

  const validationError = validateSubmission(req.body);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  const { name, email, phone, lake, message, preferred_date, other_services } = req.body;

  const lakeLabel = LAKE_LABELS[lake] || lake || '—';

  // Escaped copies of every value that goes into the email HTML
  const h = Object.fromEntries(
    Object.entries({ name, email, phone, lakeLabel, preferred_date, other_services, message }).map(([k, v]) => [k, v == null || v === '' ? v : escapeHtml(v)])
  );

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
            <td style="padding: 6px 0; color: #0A1628; font-weight: 600;">${h.name}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #718096;">Email</td>
            <td style="padding: 6px 0;"><a href="mailto:${h.email}" style="color: #2B6CB0;">${h.email}</a></td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #718096;">Phone</td>
            <td style="padding: 6px 0;">${h.phone ? `<a href="tel:${phone.replace(/[^\d+]/g, '')}" style="color: #2B6CB0;">${h.phone}</a>` : '—'}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #718096;">Lake</td>
            <td style="padding: 6px 0; color: #0A1628; font-weight: 600;">${h.lakeLabel}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #718096;">Preferred Date</td>
            <td style="padding: 6px 0; color: #0A1628;">${h.preferred_date || '—'}</td>
          </tr>
        </table>
      </div>

      ${h.other_services ? `
      <div style="padding: 24px 32px 0;">
        <h2 style="margin: 0 0 12px; font-size: 15px; color: #0A1628; text-transform: uppercase; letter-spacing: 0.06em; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px;">Other Services Requested</h2>
        <p style="margin: 0; color: #4A5568; font-size: 15px; line-height: 1.6; white-space: pre-line;">${h.other_services}</p>
      </div>` : ''}

      ${h.message ? `
      <div style="padding: 24px 32px 0;">
        <h2 style="margin: 0 0 12px; font-size: 15px; color: #0A1628; text-transform: uppercase; letter-spacing: 0.06em; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px;">Message</h2>
        <p style="margin: 0; color: #4A5568; font-size: 15px; line-height: 1.6; white-space: pre-line;">${h.message}</p>
      </div>` : ''}

      <div style="padding: 24px 32px 32px; margin-top: 8px;">
        <a href="mailto:${encodeURIComponent(email)}?subject=Re: Your CDA Dock Pro Inquiry&body=Hi ${encodeURIComponent(name)}," style="display: inline-block; background: #2B6CB0; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 15px;">Reply to ${h.name} →</a>
      </div>

      <div style="background: #e2e8f0; padding: 12px 32px; text-align: center;">
        <p style="margin: 0; font-size: 12px; color: #718096;">CDA Dock Pro LLC · Coeur d'Alene, Idaho · cdadockpro.com</p>
      </div>

    </div>
  `;

  try {
    // ---- Send email notification ----
    const emailRes = await fetch('https://api.resend.com/emails', {
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

    if (!emailRes.ok) {
      const err = await emailRes.text();
      console.error('Resend error:', err);
      return res.status(500).json({ error: 'Failed to send email.' });
    }

    // ---- Save to Airtable ----
    if (process.env.AIRTABLE_API_KEY && process.env.AIRTABLE_BASE_ID) {
      const airtableRes = await fetch(
        `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Leads`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.AIRTABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fields: {
              'Name':           name,
              'Email':          email,
              'Phone':          phone          || '',
              'Lake':           lakeLabel,
              'Estimate':       '',
              'Preferred Date': preferred_date || '',
              'Other Services': other_services || '',
              'Source':         'Contact Form',
              'Submitted At':   new Date().toISOString().split('T')[0],
            },
          }),
        }
      );

      if (!airtableRes.ok) {
        console.error('Airtable error:', await airtableRes.text());
      }
    }

    return res.status(200).json({ success: true });

  } catch (err) {
    console.error('Handler error:', err);
    return res.status(500).json({ error: 'Server error.' });
  }
}
