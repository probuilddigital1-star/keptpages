/**
 * Lulu Print API integration service.
 * Handles creating print projects, placing orders, and checking order status
 * via the Lulu Direct API v1.
 *
 * API Docs: https://developers.lulu.com/
 */

const LULU_API_BASE = 'https://api.lulu.com';
const LULU_SANDBOX_BASE = 'https://api.sandbox.lulu.com';

/**
 * Get the appropriate Lulu API base URL.
 * Uses sandbox unless LULU_SANDBOX is explicitly set to 'false'.
 */
function getBaseUrl(env) {
  if (env.LULU_SANDBOX === 'false') return LULU_API_BASE;
  return LULU_SANDBOX_BASE;
}

/**
 * Get an OAuth2 access token from Lulu.
 */
async function getAccessToken(env) {
  const baseUrl = getBaseUrl(env);
  const clientId = env.LULU_CLIENT_ID;
  const clientSecret = env.LULU_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('LULU_CLIENT_ID and LULU_CLIENT_SECRET must be configured');
  }

  const credentials = btoa(`${clientId}:${clientSecret}`);

  const response = await fetch(`${baseUrl}/auth/realms/glasstree/protocol/openid-connect/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${credentials}`,
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Lulu auth failed (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  return data.access_token;
}

/**
 * Make an authenticated request to the Lulu API.
 */
async function luluFetch(env, path, options = {}) {
  const baseUrl = getBaseUrl(env);
  const token = await getAccessToken(env);

  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Lulu API error (${response.status}) at ${path}: ${errorText}`);
  }

  return response.json();
}

// ── Named book tier → Lulu print options mapping ───────────────────────────

const TIER_TO_PRINT_OPTIONS = {
  classic:  { binding: 'PB', interior: 'BW', paper: '060UW444', cover: 'M' },
  premium:  { binding: 'CW', interior: 'FC', paper: '060UW444', cover: 'M' },
  heirloom: { binding: 'CW', interior: 'FC', paper: '080CW444', cover: 'M' },
};

// Addon overrides: coil replaces binding, glossy replaces cover, color replaces interior
const ADDON_OVERRIDES = {
  coil:   { binding: 'CO' },
  glossy: { cover: 'G' },
  color:  { interior: 'FC' }, // Classic only — validated before reaching here
};

/**
 * Resolve print options from a book tier name + addons array.
 */
export function resolvePrintOptionsFromTier(bookTier, addons = []) {
  const base = TIER_TO_PRINT_OPTIONS[bookTier];
  if (!base) throw new Error(`Unknown book tier: ${bookTier}`);

  const opts = { ...base };
  for (const addonId of addons) {
    const overrides = ADDON_OVERRIDES[addonId];
    if (overrides) Object.assign(opts, overrides);
  }
  return opts;
}

/**
 * Build a Lulu pod_package_id from print options.
 * Format: {trim}{color}{quality}{binding}{paper}{finish}
 *
 * Example: 0850X1100BWSTDPB060UW444MXX
 *
 * @param {object} printOptions - { binding, interior, paper, cover }
 * @returns {string} Lulu pod_package_id
 */
export function buildPodPackageId(printOptions = {}) {
  const trim = '0850X1100';
  const color = printOptions.interior || 'BW';
  const quality = 'STD';
  const binding = printOptions.binding || 'PB';
  const paper = printOptions.paper || '060UW444';
  const finish = (printOptions.cover || 'M') === 'G' ? 'GXX' : 'MXX';

  return `${trim}${color}${quality}${binding}${paper}${finish}`;
}

/**
 * Create a print-ready project in Lulu.
 *
 * @param {string} interiorPdfUrl - Public URL to the interior PDF file
 * @param {string} coverPdfUrl - Public URL to the cover PDF file
 * @param {string} title - Book title
 * @param {object} env - Worker environment bindings
 * @param {string} [bookTier='classic'] - Named book tier
 * @param {string[]} [addons=[]] - Array of addon IDs
 * @returns {Promise<object>} The created Lulu print job / line item data
 */
export async function createProject(interiorPdfUrl, coverPdfUrl, title, env, bookTier = 'classic', addons = [], shippingAddress = null, contactEmail = null) {
  const printOptions = resolvePrintOptionsFromTier(bookTier, addons);
  const podPackageId = buildPodPackageId(printOptions);

  const projectData = {
    line_items: [
      {
        title,
        cover: {
          source_url: coverPdfUrl,
        },
        interior: {
          source_url: interiorPdfUrl,
        },
        pod_package_id: podPackageId,
        quantity: 1,
      },
    ],
    shipping_level: 'MAIL',
  };

  // Lulu requires shipping_address and contact_email at print job creation
  if (shippingAddress) {
    projectData.shipping_address = {
      name: shippingAddress.name,
      street1: shippingAddress.street1,
      street2: shippingAddress.street2 || '',
      city: shippingAddress.city,
      state_code: toStateCode(shippingAddress.state),
      country_code: shippingAddress.country || 'US',
      postcode: shippingAddress.postalCode,
      phone_number: normalizePhone(shippingAddress.phone || shippingAddress.phoneNumber || '0000000000'),
    };
  }

  if (contactEmail) {
    projectData.contact_email = contactEmail;
  }

  const result = await luluFetch(env, '/print-jobs/', {
    method: 'POST',
    body: JSON.stringify(projectData),
  });

  return {
    id: result.id,
    status: result.status?.name || 'CREATED',
    lineItems: result.line_items?.map((item) => ({
      id: item.id,
      title: item.title,
      status: item.status?.name,
    })) || [],
    podPackageId,
    totalCost: result.costs?.total_cost_incl_tax || null,
    currency: result.costs?.currency || null,
    createdAt: result.date_created,
  };
}

/**
 * Create an order for a print project.
 *
 * @param {string} projectId - The Lulu print job ID
 * @param {object} shippingAddress - Shipping address details
 * @param {number} quantity - Number of copies
 * @param {object} env - Worker environment bindings
 * @returns {Promise<object>} Order confirmation data
 */
export async function createOrder(projectId, shippingAddress, quantity, env) {
  // In Lulu's API, the print-job IS the order.
  // Shipping details are now set at createProject() time (POST),
  // so this just fetches the current print job state for cost/status info.
  const result = await luluFetch(env, `/print-jobs/${projectId}/`);

  return {
    id: result.id,
    status: result.status?.name || 'UNPAID',
    totalCost: result.costs?.total_cost_incl_tax,
    currency: result.costs?.currency,
    shippingAddress: result.shipping_address,
    createdAt: result.date_created,
  };
}

// US state name → 2-letter code mapping (Lulu requires 2-letter codes)
const US_STATE_CODES = {
  'alabama': 'AL', 'alaska': 'AK', 'arizona': 'AZ', 'arkansas': 'AR', 'california': 'CA',
  'colorado': 'CO', 'connecticut': 'CT', 'delaware': 'DE', 'district of columbia': 'DC',
  'florida': 'FL', 'georgia': 'GA', 'hawaii': 'HI', 'idaho': 'ID', 'illinois': 'IL',
  'indiana': 'IN', 'iowa': 'IA', 'kansas': 'KS', 'kentucky': 'KY', 'louisiana': 'LA',
  'maine': 'ME', 'maryland': 'MD', 'massachusetts': 'MA', 'michigan': 'MI', 'minnesota': 'MN',
  'mississippi': 'MS', 'missouri': 'MO', 'montana': 'MT', 'nebraska': 'NE', 'nevada': 'NV',
  'new hampshire': 'NH', 'new jersey': 'NJ', 'new mexico': 'NM', 'new york': 'NY',
  'north carolina': 'NC', 'north dakota': 'ND', 'ohio': 'OH', 'oklahoma': 'OK', 'oregon': 'OR',
  'pennsylvania': 'PA', 'rhode island': 'RI', 'south carolina': 'SC', 'south dakota': 'SD',
  'tennessee': 'TN', 'texas': 'TX', 'utah': 'UT', 'vermont': 'VT', 'virginia': 'VA',
  'washington': 'WA', 'west virginia': 'WV', 'wisconsin': 'WI', 'wyoming': 'WY',
};

/**
 * Normalize a phone number to E.164-ish format for Lulu.
 * Strips non-digits, prepends +1 for US numbers if missing.
 */
function normalizePhone(phone) {
  if (!phone) return '+10000000000';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 0) return '+10000000000';
  // Already has country code (11+ digits starting with 1, or 10+ for international)
  if (digits.length >= 11) return `+${digits}`;
  // 10-digit US number — add +1
  if (digits.length === 10) return `+1${digits}`;
  // Short number (7 digits etc.) — assume US, pad with +1
  return `+1${digits}`;
}

function toStateCode(state) {
  if (!state) return '';
  const trimmed = state.trim();
  // Already a 2-letter code
  if (trimmed.length === 2) return trimmed.toUpperCase();
  // Look up full name
  return US_STATE_CODES[trimmed.toLowerCase()] || trimmed;
}

/**
 * Get the status of a Lulu order/print-job.
 *
 * @param {string} orderId - The Lulu print job ID
 * @param {object} env - Worker environment bindings
 * @returns {Promise<object>} Current order status
 */
export async function getOrderStatus(orderId, env) {
  const result = await luluFetch(env, `/print-jobs/${orderId}/`);

  return {
    id: result.id,
    status: result.status?.name || 'UNKNOWN',
    statusMessage: result.status?.messages?.join('; ') || '',
    lineItems: result.line_items?.map((item) => ({
      id: item.id,
      title: item.title,
      status: item.status?.name,
      trackingId: item.tracking_id || null,
      trackingUrl: item.tracking_urls?.[0] || null,
    })) || [],
    costs: result.costs
      ? {
          total: result.costs.total_cost_incl_tax,
          shipping: result.costs.shipping_cost,
          tax: result.costs.total_tax,
          currency: result.costs.currency,
        }
      : null,
    createdAt: result.date_created,
    modifiedAt: result.date_modified,
  };
}
