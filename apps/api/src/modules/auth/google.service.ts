import { Issuer, generators, type Client, type TokenSet } from "openid-client";
import { env, isGoogleOidcConfigured } from "@/config/env";
import { AuthenticationError, ForbiddenError } from "@/common/errors/AppError";
import { authRepository } from "./auth.repository";
import { logger } from "@/common/logger";

/**
 * Google Sign-In via OIDC authorization-code flow, verified entirely
 * server-side. We never trust a client-supplied ID token — only tokens this
 * server itself exchanged with Google's token endpoint using the client
 * secret. openid-client validates issuer, audience, signature and expiry
 * against Google's published discovery document/JWKS automatically; we
 * additionally re-check `email_verified` ourselves since account linking
 * hinges on it.
 *
 * Deliberately restricted to SUPER_ADMIN / BRANCH_ADMIN (per product
 * decision) and, since this system has no public self-registration, Google
 * sign-in only ever LINKS TO an existing admin-provisioned account by
 * verified email — it never silently creates a new account. That prevents
 * anyone with a Google account from minting themselves branch-admin access.
 */

let clientPromise: Promise<Client> | null = null;

function getClient(): Promise<Client> {
  if (!isGoogleOidcConfigured) {
    throw new Error("Google OIDC is not configured (missing GOOGLE_CLIENT_ID/SECRET/REDIRECT_URI)");
  }
  if (!clientPromise) {
    clientPromise = Issuer.discover("https://accounts.google.com").then(
      (issuer) =>
        new issuer.Client({
          client_id: env.GOOGLE_CLIENT_ID!,
          client_secret: env.GOOGLE_CLIENT_SECRET!,
          redirect_uris: [env.GOOGLE_REDIRECT_URI!],
          response_types: ["code"],
        }),
    );
  }
  return clientPromise;
}

export const googleService = {
  isConfigured: isGoogleOidcConfigured,

  buildAuthorizationRequest() {
    const state = generators.state();
    const nonce = generators.nonce();
    const codeVerifier = generators.codeVerifier();
    const codeChallenge = generators.codeChallenge(codeVerifier);
    return { state, nonce, codeVerifier, codeChallenge };
  },

  async getAuthorizationUrl(params: { state: string; nonce: string; codeChallenge: string }) {
    const client = await getClient();
    return client.authorizationUrl({
      scope: "openid email profile",
      state: params.state,
      nonce: params.nonce,
      code_challenge: params.codeChallenge,
      code_challenge_method: "S256",
    });
  },

  async handleCallback(params: {
    callbackParams: Record<string, string>;
    expectedState: string;
    expectedNonce: string;
    codeVerifier: string;
  }): Promise<TokenSet> {
    const client = await getClient();
    // openid-client validates iss/aud/exp/signature/nonce internally here.
    const tokenSet = await client.callback(env.GOOGLE_REDIRECT_URI!, params.callbackParams, {
      state: params.expectedState,
      nonce: params.expectedNonce,
      code_verifier: params.codeVerifier,
    });
    return tokenSet;
  },

  /**
   * Resolves a verified Google identity to an existing local User account.
   * Throws rather than creating a new account.
   */
  async resolveLocalUser(tokenSet: TokenSet) {
    const claims = tokenSet.claims();
    if (!claims.sub) throw new AuthenticationError("Google sign-in failed");
    if (!claims.email || claims.email_verified !== true) {
      throw new ForbiddenError("Your Google account's email is not verified");
    }

    const byGoogleSub = await authRepository.findUserByGoogleSub(claims.sub);
    if (byGoogleSub) return byGoogleSub;

    const byEmail = await authRepository.findUserByIdentifier(claims.email);
    if (!byEmail || !["SUPER_ADMIN", "BRANCH_ADMIN"].includes(byEmail.role)) {
      logger.warn({ email: claims.email }, "Google sign-in attempted for unknown/ineligible account");
      throw new ForbiddenError(
        "No admin/branch account found for this Google email. Ask your super admin to set one up.",
      );
    }
    if (byEmail.status === "DISABLED") {
      throw new ForbiddenError("This account has been disabled.");
    }

    await authRepository.linkGoogleSub(byEmail.id, claims.sub);
    return byEmail;
  },
};
