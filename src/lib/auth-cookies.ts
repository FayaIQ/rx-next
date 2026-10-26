/** Clear Auth.js / NextAuth session cookies from a middleware/response. */
export function clearSessionCookies(
  res: { cookies: { set: (name: string, value: string, opts: object) => void } },
  cookieHeader?: string | null,
) {
  const names = new Set([
    "authjs.session-token",
    "__Secure-authjs.session-token",
    "authjs.callback-url",
    "__Secure-authjs.callback-url",
    "authjs.csrf-token",
    "__Host-authjs.csrf-token",
    "next-auth.session-token",
    "__Secure-next-auth.session-token",
    "next-auth.callback-url",
    "__Secure-next-auth.callback-url",
    "next-auth.csrf-token",
    "__Host-next-auth.csrf-token",
  ]);
  for (const cookie of cookieHeader?.split(";") ?? []) {
    const name = cookie.trim().split("=", 1)[0];
    if (/^(?:__Secure-)?(?:authjs|next-auth)\.session-token\.\d+$/.test(name)) {
      names.add(name);
    }
  }
  for (const name of names) {
    res.cookies.set(name, "", {
      expires: new Date(0),
      path: "/",
      maxAge: 0,
      httpOnly: true,
      secure: name.startsWith("__Secure-") || name.startsWith("__Host-"),
      sameSite: "lax",
    });
  }
}
