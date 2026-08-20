import rateLimit from "express-rate-limit";

// Applied only to /auth/login and /auth/register (auth.routes.ts) — every
// other route already sits behind `requireAuth`, so these two are the only
// ones an attacker can hit repeatedly without ever authenticating first.
// Keyed by IP (express-rate-limit's default), in-memory (also the default) —
// fine for this app's single-process deployment; would need a shared store
// (e.g. Redis) if this ever ran as more than one instance behind a load
// balancer. Note: if this app is later deployed behind a reverse proxy,
// Express's `app.set("trust proxy", ...)` will need to be configured
// correctly for the IP key to reflect the real client rather than the
// proxy — left unset for now since there's no deployment topology decided
// yet, and setting it wrong (too permissive) lets a client spoof its IP via
// `X-Forwarded-For` and defeat the limiter entirely.
//
// Response body matches the app-wide `{ error: { message, code } }` shape
// (`shared/middleware/errorHandler.ts`) even though this never reaches that
// middleware — express-rate-limit responds directly, so the shape has to be
// set here explicitly to stay consistent for the frontend's error handling.
function rateLimitedResponse(message: string) {
  return { error: { message, code: "RATE_LIMITED" } };
}

// Generous enough for someone who mistypes a password a few times in a row,
// tight enough that brute-forcing a real password is impractical.
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimitedResponse("Too many login attempts. Please try again in 15 minutes."),
});

// Registrations are rare in normal use — this mainly guards against scripted
// account-enumeration or spam sign-ups, not accidental double-clicks.
export const registerRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimitedResponse("Too many registration attempts. Please try again in an hour."),
});
