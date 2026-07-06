export const EID_AUTH_API_BASE =
  "https://id.exesfull.com/oauth/api/esm/v5/eid/auth";

export const eidAuthEndpoint = (path: string) =>
  `${EID_AUTH_API_BASE}/${path}`;
