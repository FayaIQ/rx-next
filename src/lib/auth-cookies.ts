/** Clear Auth.js / NextAuth session cookies from a middleware/response. */
export function clearSessionCookies(
  res: { cookies: { set: (name: string, value: string, opts: object) => void } }
) {
  const names = [
    "authjs.session-token",
    "__Secure-authjs.session-token",
    "authjs.callback-url",
    "authjs.csrf-token",
    "next-auth.session-token",
    "__Secure-next-auth.session-token",
    "next-auth.callback-url",
    "next-auth.csrf-token",
  ];
  for (const name of names) {
    res.cookies.set(name, "", {
      expires: new Date(0),
      path: "/",
      maxAge: 0,
    });
  }
}
