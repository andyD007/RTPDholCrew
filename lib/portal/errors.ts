/** An error whose message is safe to show to the customer. */
export class PortalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PortalError";
  }
}
