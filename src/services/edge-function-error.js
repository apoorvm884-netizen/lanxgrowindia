export async function edgeFunctionError(error, data, fallback = 'Request failed.') {
  if (data?.error) return new Error(String(data.error));

  const response = error?.context;
  if (response && typeof response.clone === 'function') {
    const copy = response.clone();
    try {
      const body = await copy.json();
      if (body?.error) return new Error(String(body.error));
      if (body?.message) return new Error(String(body.message));
    } catch (_) {
      try {
        const message = (await response.text()).trim();
        if (message) return new Error(message);
      } catch (_) {
        // Keep the safe fallback below when the response body is unavailable.
      }
    }
  }

  const generic = error?.message;
  if (generic && !/Edge Function returned a non-2xx status code/i.test(generic)) {
    return new Error(generic);
  }
  return new Error(fallback);
}
