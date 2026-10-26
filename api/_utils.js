/**
 * CDA Dock Pro — shared helpers for the /api functions.
 * Files prefixed with "_" are not exposed as routes by Vercel.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Max length per field — anything longer is rejected as junk/spam
const MAX_LENGTHS = {
  name:           100,
  email:          254,
  phone:          30,
  lake:           50,
  sqft:           10,
  material:       50,
  addins:         300,
  estimate:       50,
  preferred_date: 100,
  other_services: 2000,
  message:        5000,
};

// Escape user input before inserting it into the notification email HTML
function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Returns an error message string, or null if the submission is valid
function validateSubmission(body) {
  if (!body || typeof body !== 'object') return 'Invalid request body.';

  const { name, email } = body;
  if (!name || !email) return 'Name and email are required.';

  for (const [field, max] of Object.entries(MAX_LENGTHS)) {
    const value = body[field];
    if (value == null) continue;
    if (typeof value !== 'string') return `Invalid value for ${field}.`;
    if (value.length > max) return `${field} is too long.`;
  }

  if (!EMAIL_RE.test(email)) return 'Please enter a valid email address.';
  return null;
}

// Hidden "website" field — real users never see it, bots fill it in
function isSpam(body) {
  return Boolean(body && body.website);
}

module.exports = { escapeHtml, validateSubmission, isSpam };
