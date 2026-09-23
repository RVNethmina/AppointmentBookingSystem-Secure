import crypto from "crypto";
import validator from "validator";

const MIN_ADMIN_PASSWORD_LENGTH = 12;

// Called at start-up: refuse to run with a missing, malformed or weak
// administrator credential (for example the original "qwerty123").
const assertAdminCredentials = () => {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (typeof email !== "string" || !validator.isEmail(email)) {
    throw new Error("ADMIN_EMAIL must be set to a valid email address");
  }
  if (
    typeof password !== "string" ||
    password.length < MIN_ADMIN_PASSWORD_LENGTH ||
    !/[A-Z]/.test(password) ||
    !/[a-z]/.test(password) ||
    !/[0-9]/.test(password) ||
    !/[^A-Za-z0-9]/.test(password)
  ) {
    throw new Error(
      `ADMIN_PASSWORD must be at least ${MIN_ADMIN_PASSWORD_LENGTH} characters and mix uppercase, lowercase, digits and symbols`
    );
  }
};

const sha256 = (value) => crypto.createHash("sha256").update(String(value)).digest();

// Constant-time comparison that does not leak the length of the secret:
// both values are hashed to 32 bytes first, so timingSafeEqual always
// compares equal-length buffers and there is no early return on length.
const safeEqual = (a, b) => crypto.timingSafeEqual(sha256(a), sha256(b));

const adminCredentialsMatch = (email, password) => {
  // evaluate both comparisons (no short-circuit) so timing does not reveal
  // which of the two was wrong
  const emailOk = safeEqual(email, process.env.ADMIN_EMAIL);
  const passwordOk = safeEqual(password, process.env.ADMIN_PASSWORD);
  return emailOk && passwordOk;
};

export { assertAdminCredentials, adminCredentialsMatch };
