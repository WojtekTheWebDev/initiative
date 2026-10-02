/**
 * What every Server Action returns.
 *
 * In production, Next.js replaces the message of an error thrown from a Server
 * Action with a generic one. So actions catch their own errors and return the
 * message as a value; `unwrap` turns it back into a thrown `Error` on the client,
 * so callers can keep plain try/catch.
 */
export type ActionResult<T = void> = { ok: true; value: T } | { ok: false; error: string };

/** Client side: the value of a successful action, or throws `Error(message)`. */
export async function unwrap<T>(result: Promise<ActionResult<T>>): Promise<T> {
  const r = await result;
  if (!r.ok) throw new Error(r.error);
  return r.value;
}
