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
 */
function getBaseUrl(env) {
  return env.ENVIRONMENT === 'production' ? LULU_API_BASE : LULU_SANDBOX_BASE;
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

/**
 * Create a print-ready project in Lulu.
 *
 * @param {string} interiorPdfUrl - Public URL to the interior PDF file
 * @param {string} coverPdfUrl - Public URL to the cover PDF file
 * @param {string} title - Book title
 * @param {object} env - Worker environment bindings
 * @returns {Promise<object>} The created Lulu print job / line item data
 */
export async function createProject(interiorPdfUrl, coverPdfUrl, title, env) {
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
        pod_package_id: '0850X1100BWSTDLW060UW444MNG',
        // 0850X1100 = 8.5" x 11" trim size
        // BW = Black & White interior
        // STD = Standard quality
        // LW = Linen Wrap (softcover)
        // 060 = 60# paper
        // UW444 = Uncoated White paper
        // MNG = Matte Laminate, No Foil, Gloss Laminate
        quantity: 1,
      },
    ],
    shipping_level: 'MAIL',
  };

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
  // We update the print job with shipping details and contact info.
  const orderData = {
    contact_email: shippingAddress.email,
    shipping_address: {
      name: shippingAddress.name,
      street1: shippingAddress.street1,
      street2: shippingAddress.street2 || '',
      city: shippingAddress.city,
      state_code: shippingAddress.state,
      country_code: shippingAddress.country || 'US',
      postcode: shippingAddress.postalCode,
      phone_number: shippingAddress.phone || '',
    },
    shipping_level: shippingAddress.shippingLevel || 'MAIL',
  };

  // Update the print job's line item quantity
  const result = await luluFetch(env, `/print-jobs/${projectId}/`, {
    method: 'PATCH',
    body: JSON.stringify(orderData),
  });

  return {
    id: result.id,
    status: result.status?.name || 'UNPAID',
    totalCost: result.costs?.total_cost_incl_tax,
    currency: result.costs?.currency,
    shippingAddress: result.shipping_address,
    createdAt: result.date_created,
  };
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
