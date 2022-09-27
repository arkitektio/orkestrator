import pkceChallenge from "pkce-challenge";

export type PKCECodePair = {
  codeVerifier: string;
  codeChallenge: string;
  createdAt: Date;
};

export const createPKCECodes = (): PKCECodePair => {
  const challenge = pkceChallenge(64);
  const createdAt = new Date();
  const codePair = {
    codeVerifier: challenge.code_verifier,
    codeChallenge: challenge.code_challenge,
    createdAt,
  };
  return codePair;
};
