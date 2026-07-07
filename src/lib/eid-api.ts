export const EID_AUTH_API_BASE =
  "https://id.exesfull.com/oauth/api/esm/v5/eid/auth";

export const EID_OA2_API_BASE =
  "https://id.exesfull.com/oauth/api/esm/v5/eid/oa2";

export const eidAuthEndpoint = (path: string) =>
  `${EID_AUTH_API_BASE}/${path}`;

export const eidOa2Endpoint = (path: string) =>
  `${EID_OA2_API_BASE}/${path}`;
