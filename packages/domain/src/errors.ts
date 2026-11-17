export type DomainErrorCode =
  | "INVALID_RECORD"
  | "UNKNOWN_ENUM"
  | "STALE_SNAPSHOT"
  | "CONFIG_CONFLICT"
  | "ASSESSMENT_INVALID"
  | "PROVIDER_UNAVAILABLE"
  | "PROVIDER_RATE_LIMITED"
  | "POLICY_REJECTED"
  | "UNSUPPORTED_OPERATION";

export class DomainError extends Error {
  constructor(
    readonly code: DomainErrorCode,
    message: string,
    readonly details?: Readonly<Record<string, string>>,
  ) {
    super(message);
    this.name = "DomainError";
  }
}
