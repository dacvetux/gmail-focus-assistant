export interface AppsScriptUtilitiesPort {
  DigestAlgorithm: { SHA_256: unknown };
  Charset: { UTF_8: unknown };
  computeDigest(algorithm: unknown, value: string, charset: unknown): number[];
}

/** Adapter for Apps Script's Utilities.computeDigest; no Node crypto dependency. */
export function createAppsScriptSha256Hex(utilities: AppsScriptUtilitiesPort): (text: string) => string {
  return (text: string): string => {
    const bytes = utilities.computeDigest(
      utilities.DigestAlgorithm.SHA_256,
      text,
      utilities.Charset.UTF_8,
    );
    return bytes.map(byte => ((byte + 256) % 256).toString(16).padStart(2, "0")).join("");
  };
}
