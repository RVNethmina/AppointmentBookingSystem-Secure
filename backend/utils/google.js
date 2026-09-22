import { OAuth2Client } from "google-auth-library";

let client;
const getClient = () => {
  if (!client) {
    client = new OAuth2Client();
  }
  return client;
};

// Verifies a Google ID token: RS256 signature against Google's published
// keys, issuer, audience (our client ID) and expiry. Returns the claims.
// Kept on an object so tests can substitute the network call.
const googleVerifier = {
  verify: async (idToken) => {
    const ticket = await getClient().verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    return ticket.getPayload();
  },
};

export default googleVerifier;
