export const SHOPIFY_STOREFRONT_API_URL = process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_API_URL || 'https://mock-shop.myshopify.com/api/2024-01/graphql.json';
export const SHOPIFY_STOREFRONT_ACCESS_TOKEN = process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN || '';

export async function queryShopify(query: string, variables = {}) {
  const response = await fetch(SHOPIFY_STOREFRONT_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Storefront-Access-Token': SHOPIFY_STOREFRONT_ACCESS_TOKEN,
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!response.ok) {
    throw new Error('Shopify API error');
  }
  return response.json();
}
