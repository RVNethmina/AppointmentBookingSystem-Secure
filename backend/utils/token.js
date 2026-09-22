import jwt from "jsonwebtoken";

// HMAC secrets shorter than this can be brute-forced offline from a single token.
const MIN_SECRET_LENGTH = 32;
const DEFAULT_EXPIRES_IN = "1d";

// Called at start-up: refuse to run with a missing or weak signing secret.
const assertJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < MIN_SECRET_LENGTH) {
    throw new Error(
      `JWT_SECRET must be set and at least ${MIN_SECRET_LENGTH} characters long`
    );
  }
};

// The only algorithm the API signs with and accepts (RFC 8725).
const ALGORITHM = "HS256";

// Every token the API issues carries an expiry.
const signAccessToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, {
    algorithm: ALGORITHM,
    expiresIn: process.env.JWT_EXPIRES_IN || DEFAULT_EXPIRES_IN,
  });

const verifyAccessToken = (token) =>
  jwt.verify(token, process.env.JWT_SECRET, { algorithms: [ALGORITHM] });

// Reads "Authorization: Bearer <token>" or the legacy per-role header
// (token / atoken / dtoken) used by the clients.
const readToken = (req, headerName) => {
  const auth = req.headers.authorization;
  if (typeof auth === "string" && auth.startsWith("Bearer ")) {
    return auth.slice(7).trim() || null;
  }
  const value = req.headers[headerName];
  return typeof value === "string" && value ? value : null;
};

export { assertJwtSecret, signAccessToken, verifyAccessToken, readToken };
