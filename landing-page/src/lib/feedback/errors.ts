export class FeedbackError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'FeedbackError';
  }
}

export function asFeedbackError(error: unknown): FeedbackError {
  if (error instanceof FeedbackError) return error;
  return new FeedbackError(
    500,
    'internal_error',
    'Something went wrong while processing your feedback.',
    { cause: error },
  );
}
