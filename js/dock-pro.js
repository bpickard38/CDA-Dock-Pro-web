/**
 * CDA Dock Pro LLC — Main JavaScript
 * Modules: Calculator, Comparison Slider, Lead Modal, Navigation, Scroll FX
 *
 * All pricing constants are grouped in PRICING_CONFIG below.
 * To adjust rates, edit PRICING_CONFIG only — no logic changes needed.
 */

'use strict';

/* ================================================================
   PRICING CONFIGURATION
   Adjust these values without touching any calculation logic.
   ================================================================ */
const PRICING_CONFIG = {

  /** Base rate per square foot by material */
  BASE_RATES: {
    wood:      0.45,   // Natural Wood (Cedar, Redwood, Pressure Treated)
    composite: 0.35,   // Composite / Trex
    concrete:  0.22,   // Concrete / Stone
  },

  /** Flat-fee add-ons */
  ADDON_PEST:      50,   // Spider web & pest removal
  ADDON_FURNITURE: 75,   // Dock furniture cleaning

  /** Sealant: price per sqft, ONLY applied for Natural Wood (Option A) */
  SEALANT_PER_SQFT: 0.50,

  /** Output range: ±10% around the base estimate */
  RANGE_FACTOR: 0.10,

  /** Minimum job price — protects margins on drive + setup */
  MINIMUM_PRICE: 200,

  /** Round estimates to the nearest $N */
  ROUND_TO: 10,
};


/* ================================================================
   UTILITY HELPERS
   ================================================================ */

/**
 * Round a number to the nearest multiple of `factor`.
 * @param {number} value
 * @param {number} factor
 * @returns {number}
 */
function roundTo(value, factor) {
  return Math.round(value / factor) * factor;
}

/**
 * Clamp a value between min and max.
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/**
 * Format a dollar amount as "$X,XXX".
 * @param {number} amount
 * @returns {string}
 */
function formatDollars(amount) {
  return '$' + amount.toLocaleString('en-US');
}


/* ================================================================
   CALCULATOR MODULE
   ================================================================ */
(function initCalculator() {

  const form         = document.getElementById('calc-form');
  const sqftInput    = document.getElementById('sqft');
  const materialSel  = document.getElementById('material');
  const lakeSel      = document.getElementById('lake');
  const sealantCb    = document.getElementById('addon-sealant');
  const sealantLabel = document.getElementById('sealant-label');
  const sealantNote  = document.getElementById('sealant-note');
  const resultPanel  = document.getElementById('calc-result');
  const resultRange  = document.getElementById('result-range');
  const openModalBtn = document.getElementById('open-modal-btn');

  if (!form) return; // guard: element not on page

  /** Holds the most recently calculated estimate for passing to the modal */
  let lastEstimate = null;

  /**
   * Core pricing engine.
   * Returns { low, high, base } rounded to nearest $ROUND_TO.
   *
   * @param {object} params
   * @param {number}  params.sqft
   * @param {string}  params.material  — 'wood' | 'composite' | 'concrete'
   * @param {boolean} params.pest
   * @param {boolean} params.furniture
   * @param {boolean} params.sealant
   * @returns {{ low: number, high: number, base: number }}
   */
  function calculateEstimate({ sqft, material, pest, furniture, sealant }) {
    const rate = PRICING_CONFIG.BASE_RATES[material] ?? PRICING_CONFIG.BASE_RATES.wood;

    let base = sqft * rate;

    // Flat add-ons
    if (pest)      base += PRICING_CONFIG.ADDON_PEST;
    if (furniture) base += PRICING_CONFIG.ADDON_FURNITURE;

    // Sealant — Option A: only for Natural Wood
    if (sealant && material === 'wood') {
      base += sqft * PRICING_CONFIG.SEALANT_PER_SQFT;
    }

    // Apply minimum price floor
    base = Math.max(base, PRICING_CONFIG.MINIMUM_PRICE);

    const low  = roundTo(base * (1 - PRICING_CONFIG.RANGE_FACTOR), PRICING_CONFIG.ROUND_TO);
    const high = roundTo(base * (1 + PRICING_CONFIG.RANGE_FACTOR), PRICING_CONFIG.ROUND_TO);

    // Ensure low never drops below minimum even after rounding
    const safeLow  = Math.max(low,  PRICING_CONFIG.MINIMUM_PRICE);
    const safeHigh = Math.max(high, PRICING_CONFIG.MINIMUM_PRICE);

    return { low: safeLow, high: safeHigh, base: roundTo(base, PRICING_CONFIG.ROUND_TO) };
  }

  /**
   * Enable or disable the sealant checkbox based on selected material.
   * Only Natural Wood (value="wood") supports sealant — Option A.
   */
  function updateSealantAvailability() {
    const isWood = materialSel.value === 'wood';

    sealantCb.disabled = !isWood;
    sealantLabel.classList.toggle('is-disabled', !isWood);
    sealantNote.classList.toggle('is-visible', !isWood && materialSel.value !== '');

    // Uncheck sealant if material changes away from wood
    if (!isWood) sealantCb.checked = false;
  }

  /** Validate sqft input; return error message or empty string */
  function validateSqft(value) {
    const num = Number(value);
    if (!value || isNaN(num)) return 'Please enter a square footage.';
    if (num < 50)   return 'Minimum dock size is 50 sqft.';
    if (num > 5000) return 'For docks over 5,000 sqft, please contact us directly.';
    return '';
  }

  /** Show or clear sqft validation error */
  function setFieldError(inputEl, errorEl, message) {
    if (message) {
      inputEl.setAttribute('aria-invalid', 'true');
      errorEl.textContent = message;
    } else {
      inputEl.removeAttribute('aria-invalid');
      errorEl.textContent = '';
    }
  }

  // ---- Event listeners ----

  // Update sealant state whenever material changes
  materialSel.addEventListener('change', updateSealantAvailability);

  // Form submission → calculate and show results
  form.addEventListener('submit', function (e) {
    e.preventDefault();

    const sqftError = validateSqft(sqftInput.value);
    setFieldError(sqftInput, document.getElementById('sqft-error'), sqftError);
    if (sqftError) { sqftInput.focus(); return; }

    const params = {
      sqft:      Number(sqftInput.value),
      material:  materialSel.value || 'wood',
      pest:      document.getElementById('addon-pest').checked,
      furniture: document.getElementById('addon-furniture').checked,
      sealant:   sealantCb.checked,
    };

    const estimate = calculateEstimate(params);
    lastEstimate = {
      ...estimate,
      ...params,
      lake: lakeSel.value,
      rangeText: `${formatDollars(estimate.low)} – ${formatDollars(estimate.high)}`,
    };

    // Render result
    resultRange.textContent = lastEstimate.rangeText;
    resultPanel.hidden = false;
    resultPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });

  // "Get Formal Quote" → open modal with pre-filled estimate data
  openModalBtn.addEventListener('click', function () {
    if (lastEstimate) openLeadModal(lastEstimate);
  });

  // Expose estimate accessor for modal module
  window.__cdaDockEstimate = () => lastEstimate;

})();


/* ================================================================
   COMPARISON SLIDER MODULE
   ================================================================ */
(function initSlider() {

  const slider = document.getElementById('comparison-slider');
  const handle = document.getElementById('slider-handle');
  const after  = slider?.querySelector('.slider-panel--after');

  if (!slider || !handle || !after) return;

  let isDragging = false;
  let currentPercent = 50; // start at 50%

  /** Update clip-path and handle position to `percent` (0–100) */
  function setPosition(percent) {
    percent = clamp(percent, 0, 100);
    currentPercent = percent;

    // Reveal the "after" panel from the left edge up to `percent`
    after.style.clipPath = `inset(0 ${100 - percent}% 0 0)`;
    handle.style.left = `${percent}%`;

    // Update ARIA value for screen readers
    slider.setAttribute('aria-valuenow', Math.round(percent));
  }

  /** Convert a clientX position to a percent relative to the slider */
  function clientXToPercent(clientX) {
    const rect = slider.getBoundingClientRect();
    return ((clientX - rect.left) / rect.width) * 100;
  }

  // ---- Pointer events (covers mouse + touch) ----

  slider.addEventListener('pointerdown', function (e) {
    isDragging = true;
    slider.setPointerCapture(e.pointerId); // keeps tracking even if pointer leaves element
    setPosition(clientXToPercent(e.clientX));
  });

  slider.addEventListener('pointermove', function (e) {
    if (!isDragging) return;
    // Use requestAnimationFrame for smooth rendering
    requestAnimationFrame(() => setPosition(clientXToPercent(e.clientX)));
  });

  slider.addEventListener('pointerup',     () => { isDragging = false; });
  slider.addEventListener('pointercancel', () => { isDragging = false; });

  // ---- Keyboard support (arrow keys) ----

  slider.addEventListener('keydown', function (e) {
    const STEP = 5; // percent per keypress
    if (e.key === 'ArrowLeft')  { setPosition(currentPercent - STEP); e.preventDefault(); }
    if (e.key === 'ArrowRight') { setPosition(currentPercent + STEP); e.preventDefault(); }
    if (e.key === 'Home')       { setPosition(0);   e.preventDefault(); }
    if (e.key === 'End')        { setPosition(100); e.preventDefault(); }
  });

  // Initialize at 50%
  setPosition(50);

})();


/* ================================================================
   LEAD CAPTURE MODAL MODULE
   ================================================================ */

/** Opens the lead modal and pre-fills estimate data */
function openLeadModal(estimate) {
  const modal   = document.getElementById('lead-modal');
  const estEl   = document.getElementById('modal-estimate');
  const success = document.getElementById('modal-success');
  const mForm   = document.getElementById('modal-form');

  if (!modal) return;

  // Pre-fill the estimate summary
  if (estEl && estimate) {
    estEl.textContent = `Estimated Investment: ${estimate.rangeText}`;
  }

  // Populate hidden fields so they submit with the lead
  const setValue = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = val ?? '';
  };
  setValue('m-sqft',     estimate?.sqft     ?? '');
  setValue('m-material', estimate?.material ?? '');
  setValue('m-addins',   buildAddinsString(estimate));
  setValue('m-estimate', estimate?.rangeText ?? '');

  // Pre-select lake if user chose one in the calculator
  const mLake = document.getElementById('m-lake');
  if (mLake && estimate?.lake) mLake.value = estimate.lake;

  // Reset to form state (hide success message)
  if (mForm)   mForm.hidden    = false;
  if (success) success.hidden  = true;

  modal.showModal();
}

/** Build a human-readable add-ins summary string */
function buildAddinsString(estimate) {
  if (!estimate) return '';
  const parts = [];
  if (estimate.pest)      parts.push('Pest Removal');
  if (estimate.furniture) parts.push('Furniture Cleaning');
  if (estimate.sealant)   parts.push('Sealant');
  return parts.join(', ') || 'None';
}

(function initModal() {

  const modal     = document.getElementById('lead-modal');
  const closeBtn  = document.getElementById('modal-close');
  const mForm     = document.getElementById('modal-form');
  const success   = document.getElementById('modal-success');

  if (!modal) return;

  // Close button
  closeBtn?.addEventListener('click', () => modal.close());

  // Click on the backdrop (dialog element itself, not its children) closes modal
  modal.addEventListener('click', function (e) {
    if (e.target === modal) modal.close();
  });

  // Form submission
  mForm?.addEventListener('submit', async function (e) {
    e.preventDefault();

    const submitBtn = mForm.querySelector('button[type="submit"]');
    submitBtn.textContent = 'Sending…';
    submitBtn.disabled = true;

    const formData = Object.fromEntries(new FormData(mForm));

    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error('Server error');

      // Show success message
      mForm.hidden   = true;
      success.hidden = false;

      // Auto-close after 4 seconds
      setTimeout(() => modal.close(), 4000);

    } catch (err) {
      console.error('Lead submission error:', err);
      submitBtn.textContent = 'Error — please try again';
      submitBtn.disabled = false;
      submitBtn.style.backgroundColor = '#E53E3E';
    }
  });

})();


/* ================================================================
   CONTACT FORM MODULE (standalone section form)
   ================================================================ */
(function initContactForm() {

  const form = document.getElementById('contact-form');
  if (!form) return;

  form.addEventListener('submit', async function (e) {
    e.preventDefault();

    const btn = form.querySelector('button[type="submit"]');
    btn.textContent = 'Sending…';
    btn.disabled = true;

    const formData = Object.fromEntries(new FormData(form));

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error('Server error');

      btn.textContent = 'Message Sent! ✓';
      btn.style.backgroundColor = '#38A169';
      form.reset();

    } catch (err) {
      console.error('Contact form error:', err);
      btn.textContent = 'Error — please try again';
      btn.disabled = false;
      btn.style.backgroundColor = '#E53E3E';
    }
  });

})();


/* ================================================================
   MOBILE NAVIGATION MODULE
   ================================================================ */
(function initNav() {

  const toggle  = document.getElementById('nav-toggle');
  const menu    = document.getElementById('nav-menu');

  if (!toggle || !menu) return;

  function openMenu() {
    menu.classList.add('is-open');
    toggle.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('aria-label', 'Close navigation menu');
  }

  function closeMenu() {
    menu.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Open navigation menu');
  }

  function isOpen() {
    return menu.classList.contains('is-open');
  }

  toggle.addEventListener('click', () => isOpen() ? closeMenu() : openMenu());

  // Close nav when any anchor link is clicked
  menu.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', closeMenu);
  });

  // Close nav on outside click
  document.addEventListener('click', function (e) {
    if (isOpen() && !menu.contains(e.target) && !toggle.contains(e.target)) {
      closeMenu();
    }
  });

  // Close nav on Escape key
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && isOpen()) closeMenu();
  });

})();


/* ================================================================
   SCROLL ANIMATIONS — fade-in sections as they enter viewport
   ================================================================ */
(function initScrollFx() {

  // Only run if IntersectionObserver is supported
  if (!('IntersectionObserver' in window)) return;

  // Add fade-in class to major sections
  const targets = document.querySelectorAll(
    '.section-services, .section-gallery, .section-calculator, .section-contact, .trust-bar, .service-card'
  );

  targets.forEach(el => el.classList.add('fade-in'));

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target); // animate once only
        }
      });
    },
    { threshold: 0.12 }
  );

  targets.forEach(el => observer.observe(el));

})();


/* ================================================================
   FOOTER YEAR — keep copyright current automatically
   ================================================================ */
(function setFooterYear() {
  const el = document.getElementById('footer-year');
  if (el) el.textContent = new Date().getFullYear();
})();
