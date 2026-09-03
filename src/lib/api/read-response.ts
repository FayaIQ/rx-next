/**
 * Reads a JSON API response without leaking JSON parser errors to the UI when
 * a proxy, CDN, or hosting error page is returned as HTML.
 */
export async function readApiResponse<T>(
  response: Response,
  fallbackMessage: string
): Promise<T> {
  const body = await response.text();

  try {
    return JSON.parse(body) as T;
  } catch {
    throw new Error(fallbackMessage);
  }
}
