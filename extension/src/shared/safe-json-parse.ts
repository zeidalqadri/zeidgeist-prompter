/**
 * Safe JSON parser for API responses.
 *
 * Validates Content-Type before parsing and provides clear error messages
 * instead of cryptic "Unexpected token '<'" errors when HTML is returned.
 */

export class JsonParseError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly contentType?: string
  ) {
    super(message);
    this.name = 'JsonParseError';
  }
}

export async function safeJsonParse<T = unknown>(response: Response): Promise<T> {
  const contentType = response.headers.get('content-type') || '';

  if (!contentType.includes('application/json')) {
    const preview = await response.text().catch(() => '');
    const isHtml = preview.trimStart().startsWith('<');

    throw new JsonParseError(
      isHtml
        ? 'Server returned an HTML page instead of data. The API may be temporarily unavailable.'
        : `Unexpected response format (${contentType || 'unknown'}). Please try again.`,
      response.status,
      contentType
    );
  }

  try {
    return await response.json() as T;
  } catch {
    throw new JsonParseError(
      'Failed to parse server response. Please try again.',
      response.status,
      contentType
    );
  }
}
