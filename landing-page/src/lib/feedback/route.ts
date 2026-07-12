import { FeedbackError } from './errors';

export function parseFeedbackNumber(value: string | undefined): number {
  if (!value || !/^[1-9]\d*$/u.test(value)) {
    throw new FeedbackError(400, 'invalid_feedback_number', 'Invalid feedback number.');
  }
  return Number(value);
}
