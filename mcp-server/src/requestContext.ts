import { AsyncLocalStorage } from 'node:async_hooks';
import { nanoid } from 'nanoid';

interface RequestContext {
  requestId: string;
  signal?: AbortSignal;
}

const requestContext = new AsyncLocalStorage<RequestContext>();

export function createRequestId(): string {
  return nanoid(16);
}

export function runWithRequestId<T>(
  requestId: string,
  callback: () => T,
  signal?: AbortSignal,
): T {
  return requestContext.run({ requestId, signal }, callback);
}

export function getRequestId(): string {
  return requestContext.getStore()?.requestId ?? createRequestId();
}

export function getRequestAbortSignal(): AbortSignal | undefined {
  return requestContext.getStore()?.signal;
}
