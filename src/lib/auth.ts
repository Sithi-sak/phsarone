type ClerkGetToken = (options?: Record<string, unknown>) => Promise<string | null>;

const AUTH_TIMEOUT_MS = 15000;

type GetAuthTokenOptions = {
  retries?: number;
  timeoutMs?: number;
};

async function withTimeout<T>(
  promise: Promise<T>,
  context: string,
  timeoutMs: number,
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`Authentication timed out during ${context}.`));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

export async function getAuthToken(
  getToken: ClerkGetToken,
  context: string,
  options?: GetAuthTokenOptions,
): Promise<string> {
  const retries = Math.max(0, options?.retries ?? 0);
  const timeoutMs = options?.timeoutMs ?? AUTH_TIMEOUT_MS;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      console.log(
        `[Auth] Requesting token for ${context} (attempt ${attempt + 1}/${retries + 1})`,
      );
      const token = await withTimeout(getToken({}), context, timeoutMs);

      if (!token) {
        throw new Error(`Missing auth token during ${context}.`);
      }

      return token;
    } catch (error) {
      if (attempt === retries) {
        throw error;
      }
    }
  }

  throw new Error(`Missing auth token during ${context}.`);
}
