type PublicKeyCredentialLike = {
  id: string;
  rawId: ArrayBuffer;
  type: string;
  response: {
    clientDataJSON: ArrayBuffer;
    attestationObject?: ArrayBuffer;
    authenticatorData?: ArrayBuffer;
    signature?: ArrayBuffer;
    userHandle?: ArrayBuffer | null;
    getTransports?: () => string[];
  };
};

function trimPadding(value: string) {
  return value.replace(/=+$/g, "");
}

function normalizeBase64Input(value: string) {
  return value
    .trim()
    .replace(/=/g, "")
    .replace(/[^A-Za-z0-9+/_-]/g, "");
}

export function base64UrlToUint8Array(value: string): Uint8Array {
  const normalized = normalizeBase64Input(value).replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function uint8ArrayToBase64Url(value: Uint8Array) {
  let binary = "";
  value.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return trimPadding(btoa(binary).replace(/\+/g, "-").replace(/\//g, "_"));
}

export function arrayBufferToBase64Url(value: ArrayBuffer) {
  return uint8ArrayToBase64Url(new Uint8Array(value));
}

function normalizeCredentialOptions<T extends Record<string, any>>(options: T): T {
  return options;
}

export function normalizeCreateOptions(options: any) {
  const next = structuredClone(options ?? {});
  if (typeof next.challenge === "string") {
    next.challenge = base64UrlToUint8Array(next.challenge);
  }
  if (typeof next.user?.id === "string") {
    next.user.id = base64UrlToUint8Array(next.user.id);
  }
  if (Array.isArray(next.excludeCredentials)) {
    next.excludeCredentials = next.excludeCredentials.map((credential: any) => ({
      ...credential,
      id: typeof credential.id === "string" ? base64UrlToUint8Array(credential.id) : credential.id,
    }));
  }
  return normalizeCredentialOptions(next);
}

export function normalizeGetOptions(options: any) {
  const next = structuredClone(options ?? {});
  if (typeof next.challenge === "string") {
    next.challenge = base64UrlToUint8Array(next.challenge);
  }
  if (Array.isArray(next.allowCredentials)) {
    next.allowCredentials = next.allowCredentials.map((credential: any) => ({
      ...credential,
      id: typeof credential.id === "string" ? base64UrlToUint8Array(credential.id) : credential.id,
    }));
  }
  return normalizeCredentialOptions(next);
}

export function serializeCreateCredential(credential: PublicKeyCredentialLike) {
  return {
    id: credential.id,
    rawId: arrayBufferToBase64Url(credential.rawId),
    type: credential.type,
    response: {
      clientDataJSON: arrayBufferToBase64Url(credential.response.clientDataJSON),
      attestationObject: arrayBufferToBase64Url(credential.response.attestationObject ?? new ArrayBuffer(0)),
      transports: credential.response.getTransports ? credential.response.getTransports() : [],
    },
  };
}

export function serializeGetCredential(credential: PublicKeyCredentialLike) {
  return {
    id: credential.id,
    rawId: arrayBufferToBase64Url(credential.rawId),
    type: credential.type,
    response: {
      clientDataJSON: arrayBufferToBase64Url(credential.response.clientDataJSON),
      authenticatorData: arrayBufferToBase64Url(credential.response.authenticatorData ?? new ArrayBuffer(0)),
      signature: arrayBufferToBase64Url(credential.response.signature ?? new ArrayBuffer(0)),
      userHandle: credential.response.userHandle
        ? arrayBufferToBase64Url(credential.response.userHandle)
        : null,
    },
  };
}
