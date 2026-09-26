/**
 * Contract state machine (pure, unit tested).
 *
 *   draft ──send──▶ sent ──view──▶ viewed
 *                     │              │
 *                     └────sign──────┴──▶ signed
 *   draft/sent/viewed ──void──▶ void
 *   signed ──void (admin, with reason)──▶ void
 */
export type ContractStatus = "draft" | "sent" | "viewed" | "signed" | "void";
export type ContractAction = "send" | "view" | "sign" | "void" | "edit";

const TRANSITIONS: Record<ContractAction, { from: ContractStatus[]; to: ContractStatus | null }> = {
  send: { from: ["draft"], to: "sent" },
  view: { from: ["sent"], to: "viewed" },
  sign: { from: ["sent", "viewed"], to: "signed" },
  void: { from: ["draft", "sent", "viewed", "signed"], to: "void" },
  edit: { from: ["draft", "sent", "viewed"], to: null }, // edits keep the status
};

export function canTransition(from: ContractStatus, action: ContractAction): boolean {
  return TRANSITIONS[action].from.includes(from);
}

export function nextStatus(from: ContractStatus, action: ContractAction): ContractStatus {
  if (!canTransition(from, action)) throw new ContractStateError(`Cannot ${action} a ${from} contract`);
  return TRANSITIONS[action].to ?? from;
}

export class ContractStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ContractStateError";
  }
}

/** Validate a signature submission (pure). */
export function validateSignature(input: { signerName: string; agreed: boolean; expectedHash: string; presentedHash: string }): string | null {
  const name = input.signerName.trim();
  if (name.length < 3 || !/\s/.test(name)) return "Please type your full name (first and last).";
  if (name.length > 120) return "Name is too long.";
  if (!input.agreed) return "Please confirm you agree to the terms.";
  if (input.expectedHash !== input.presentedHash) return "This contract was updated while you were reviewing it. Please review the latest version.";
  return null;
}
