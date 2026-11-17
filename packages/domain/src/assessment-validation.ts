import { DomainError } from "./errors";

/** Maximum absolute error allowed when a provider's choice distribution sums to 1. */
export const CHOICE_DISTRIBUTION_TOLERANCE = 0.01;

export interface ChoiceAssessmentInput {
  type: "choice";
  choice: string;
  confidence: number;
  probabilities: Record<string, number>;
}

/** Validate semantic constraints that JSON Schema cannot express (notably sums). */
export function validateChoiceAssessment(
  answer: unknown,
  allowedAlternatives: readonly string[],
  tolerance = CHOICE_DISTRIBUTION_TOLERANCE,
): asserts answer is ChoiceAssessmentInput {
  if (!isRecord(answer) || answer.type !== "choice" || typeof answer.choice !== "string") {
    invalid("Answer must be a choice assessment with a string choice");
  }
  if (!Number.isFinite(answer.confidence) || answer.confidence < 0 || answer.confidence > 1) {
    invalid("Choice confidence must be a finite number in [0, 1]");
  }
  if (!isRecord(answer.probabilities)) invalid("Choice probabilities must be an object");
  if (!Number.isFinite(tolerance) || tolerance < 0 || tolerance >= 1) {
    invalid("Distribution tolerance must be finite and in [0, 1)");
  }

  const alternatives = [...new Set(allowedAlternatives)];
  if (alternatives.length === 0 || alternatives.some(item => !item)) {
    invalid("At least one non-empty allowed alternative is required");
  }
  const expected = new Set(alternatives);
  const actual = Object.keys(answer.probabilities);
  if (actual.length !== expected.size || actual.some(key => !expected.has(key))) {
    invalid("Probability keys must exactly match the allowed alternatives");
  }
  if (!expected.has(answer.choice)) invalid("Selected choice is not an allowed alternative");

  let total = 0;
  for (const [alternative, probability] of Object.entries(answer.probabilities)) {
    if (!expected.has(alternative) || typeof probability !== "number" || !Number.isFinite(probability) || probability < 0 || probability > 1) {
      invalid(`Probability for ${alternative} must be finite and in [0, 1]`);
    }
    total += probability;
  }
  if (Math.abs(total - 1) > tolerance) {
    invalid(`Choice probabilities must sum to 1 within ${tolerance}; received ${total}`);
  }
}

function isRecord(value: unknown): value is Record<string, any> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function invalid(message: string): never {
  throw new DomainError("ASSESSMENT_INVALID", message);
}
