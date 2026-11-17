export type DomainErrorCode =
  | "INVALID_RECORD"
  | "UNKNOWN_ENUM"
  | "STALE_SNAPSHOT"
  | "CONFIG_CONFLICT"
  | "ASSESSMENT_INVALID"
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
