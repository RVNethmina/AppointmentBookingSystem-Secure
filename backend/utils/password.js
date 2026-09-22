import bcrypt from "bcrypt";
import crypto from "crypto";

const SALT_ROUNDS = 10;

// Hash of a random value with the same cost as real hashes, compared
// against when an account has no password, so every login attempt costs
// exactly one bcrypt comparison.
const DUMMY_HASH = bcrypt.hashSync(crypto.randomBytes(16).toString("hex"), SALT_ROUNDS);

// Performs exactly one bcrypt comparison whether or not a hash exists,
// and never throws. Returns true only for a real hash that matches.
const verifyPassword = async (password, hash) => {
  const hasHash = typeof hash === "string" && hash.length > 0;
  try {
    const match = await bcrypt.compare(String(password), hasHash ? hash : DUMMY_HASH);
    return hasHash && match;
  } catch (error) {
    return false;
  }
};

export { verifyPassword };
