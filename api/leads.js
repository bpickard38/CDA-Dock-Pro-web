/**
 * CDA Dock Pro — /api/leads
 * Vercel serverless function: receives quote form submissions and sends
 * a formatted lead notification email via the Resend API.
 *
 * Required environment variable (set in Vercel dashboard):
 *   RESEND_API_KEY  — your Resend API key (re_xxxxxxxxxxxx)
 */

const NOTIFY_EMAIL = 'bpickard38@gmail.com'; // email that receives lead notifications

// Material label map for readable email output
const MATERIAL_LABELS = {
  wood:      'Natural Wood (Cedar / Redwood / Pressure Treated)',
  composite: 'Composite / Trex',
  concrete:  'Concrete / Stone',
};

const LAKE_LABELS = {
  cda:     "Lake Coeur d'Alene",
  hayden:  'Hayden Lake',
  twin:    'Twin Lakes',
  spirit:  'Spirit Lake',
  other:   'Other / Not Sure',
};

module.exports = async function handler(req, res) {
  // Only accept POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, email, phone, lake, sqft, material, addins, estimate, preferred_date, other_services } = req.body;

  // Basic validation — name and email are required
  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required.' });
  }

  const materialLabel = MATERIAL_LABELS[material] || material || '—';
  const lakeLabel     = LAKE_LABELS[lake]         || lake     || '—';

  // Build the HTML email body
  const html = `
    <div style="font-family: -apple-system, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0;">

      <!-- Header -->
      <div style="background: #0A1628; padding: 24px 32px;">
        <h1 style="margin: 0; color: #ffffff; font-size: 20px;">⚓ New Quote Request</h1>
        <p style="margin: 6px 0 0; color: rgba(255,255,255,0.65); font-size: 14px;">CDA Dock Pro LLC</p>
      </div>

      <!-- Estimate highlight -->
      <div style="background: #2B6CB0; padding: 16px 32px; text-align: center;">
        <p style="margin: 0; color: rgba(255,255,255,0.8); font-size: 13px; text-transform: uppercase; letter-spacing: 0.08em;">Estimated Investment</p>
        <p style="margin: 4px 0 0; color: #ffffff; font-size: 28px; font-weight: 700;">${estimate || '—'}</p>
      </div>

      <!-- Contact info -->
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
            <td style="padding: 6px 0; color: #0A1628;">${phone ? `<a href="tel:${phone}" style="color: #2B6CB0;">${phone}</a>` : '—'}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #718096;">Lake</td>
            <td style="padding: 6px 0; color: #0A1628; font-weight: 600;">${lakeLabel}</td>
          </tr>
        </table>
      </div>

      <!-- Dock details -->
      <div style="padding: 24px 32px 0;">
        <h2 style="margin: 0 0 16px; font-size: 15px; color: #0A1628; text-transform: uppercase; letter-spacing: 0.06em; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px;">Dock Details</h2>
        <table style="width: 100%; border-collapse: collapse; font-size: 15px;">
          <tr>
            <td style="padding: 6px 0; color: #718096; width: 130px;">Square Footage</td>
            <td style="padding: 6px 0; color: #0A1628; font-weight: 600;">${sqft ? sqft + ' sqft' : '—'}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #718096;">Material</td>
            <td style="padding: 6px 0; color: #0A1628;">${materialLabel}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #718096;">Add-Ons</td>
            <td style="padding: 6px 0; color: #0A1628;">${addins || 'None'}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #718096;">Preferred Date</td>
            <td style="padding: 6px 0; color: #0A1628;">${preferred_date || '—'}</td>
          </tr>
        </table>
      </div>

      ${other_services ? `
      <!-- Other services -->
      <div style="padding: 24px 32px 0;">
        <h2 style="margin: 0 0 12px; font-size: 15px; color: #0A1628; text-transform: uppercase; letter-spacing: 0.06em; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px;">Other Services Requested</h2>
        <p style="margin: 0; color: #4A5568; font-size: 15px; line-height: 1.6; white-space: pre-line;">${other_services}</p>
      </div>` : ''}

      <!-- CTA footer -->
      <div style="padding: 24px 32px 32px; margin-top: 8px;">
        <a href="mailto:${email}?subject=Your CDA Dock Pro Quote&body=Hi ${name}," style="display: inline-block; background: #2B6CB0; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 15px;">Reply to ${name} →</a>
      </div>

      <!-- Footer -->
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
        subject: `New Quote Request — ${name} · ${lakeLabel} · ${estimate || 'no estimate'}`,
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
              'Estimate':       estimate       || '',
              'Sqft':           sqft ? Number(sqft) : null,
              'Material':       materialLabel,
              'Add-ons':        addins         || 'None',
              'Preferred Date': preferred_date || '',
              'Other Services': other_services || '',
              'Source':         'Quote Request',
              'Submitted At':   new Date().toISOString().split('T')[0],
            },
          }),
        }
      );

      if (!airtableRes.ok) {
        // Log but don't fail the request — email already sent
        console.error('Airtable error:', await airtableRes.text());
      }
    }

    return res.status(200).json({ success: true });

  } catch (err) {
    console.error('Handler error:', err);
    return res.status(500).json({ error: 'Server error.' });
  }
}
