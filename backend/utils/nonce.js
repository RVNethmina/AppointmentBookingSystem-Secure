import crypto from "crypto";
import jwt from "jsonwebtoken";

const NONCE_TTL_SECONDS = 10 * 60;
const NONCE_TYPE = "google-oidc-nonce";

// Nonce tokens are signed with a key derived from the application secret
// (HMAC-SHA-256 with a fixed label), so a nonce token can never be
// accepted as an access token and vice versa.
const nonceKey = () =>
  crypto.createHmac("sha256", process.env.JWT_SECRET).update(NONCE_TYPE).digest();

// jti -> expiry (ms) of nonce tokens that have already been used.
// In memory: correct while a single API instance runs.
const usedNonceTokens = new Map();

const purgeExpired = () => {
  const now = Date.now();
  for (const [jti, expiresAt] of usedNonceTokens) {
    if (expiresAt <= now) usedNonceTokens.delete(jti);
  }
};

// Returns a random 256-bit nonce for the Google button and a signed,
// short-lived nonce token that binds it to this sign-in attempt.
const issueNonce = () => {
  const nonce = crypto.randomBytes(32).toString("base64url");
  const nonceToken = jwt.sign({ nonce, typ: NONCE_TYPE }, nonceKey(), {
    algorithm: "HS256",
    expiresIn: NONCE_TTL_SECONDS,
    jwtid: crypto.randomUUID(),
  });
  return { nonce, nonceToken };
};

// Throws if the nonce token is invalid, expired or not a nonce token.
const verifyNonceToken = (nonceToken) => {
  const decoded = jwt.verify(nonceToken, nonceKey(), { algorithms: ["HS256"] });
  if (decoded.typ !== NONCE_TYPE || typeof decoded.nonce !== "string" || !decoded.jti) {
    throw new Error("Invalid nonce token");
  }
  return decoded;
};

// Marks a nonce token as used; returns false if it was used before.
const consumeNonceToken = (decoded) => {
  purgeExpired();
  if (usedNonceTokens.has(decoded.jti)) return false;
  usedNonceTokens.set(decoded.jti, decoded.exp * 1000);
  return true;
};

export { issueNonce, verifyNonceToken, consumeNonceToken };
