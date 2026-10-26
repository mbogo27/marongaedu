// Edge-safe constants shared by proxy.ts and the Node session code.
export const SESSION_COOKIE = "maronga_session";
export const REMEMBER_DAYS = 30;
export const SESSION_HOURS = 24;
/** Cookie values are "<r|s>.<token>"; the prefix lets the proxy refresh remember-me cookies. */
export const REMEMBER_PREFIX = "r.";
export const SESSION_PREFIX = "s.";
