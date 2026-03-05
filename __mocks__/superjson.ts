/**
 * Manual mock for superjson ESM module
 * Used by Jest to avoid ESM parsing issues in test environment
 *
 * @see https://github.com/Blitz-js/superjson
 * @see Issue #204 - API Routes compatibility
 */

interface SuperJSONResult<T = unknown> {
  json: T;
  meta?: Record<string, unknown>;
}

interface SuperJSON {
  serialize: <T>(data: T) => SuperJSONResult<T>;
  deserialize: <T>(payload: SuperJSONResult<T>) => T;
  stringify: (data: unknown) => string;
  parse: <T = unknown>(str: string) => T;
  registerClass: (cls: new (...args: unknown[]) => unknown, options?: { identifier?: string }) => void;
  registerSymbol: (sym: symbol, identifier?: string) => void;
  registerCustom: <T>(
    transformer: { isApplicable: (v: unknown) => boolean; serialize: (v: T) => unknown; deserialize: (v: unknown) => T },
    identifier: string,
  ) => void;
}

const superjson: SuperJSON = {
  serialize: <T>(data: T): SuperJSONResult<T> => ({ json: data, meta: undefined }),
  deserialize: <T>(payload: SuperJSONResult<T>): T => payload.json ?? (payload as unknown as T),
  stringify: (data: unknown): string => JSON.stringify(data),
  parse: <T = unknown>(str: string): T => JSON.parse(str) as T,
  registerClass: (): void => {},
  registerSymbol: (): void => {},
  registerCustom: (): void => {},
};

export default superjson;
export const { serialize, deserialize, stringify, parse, registerClass, registerSymbol, registerCustom } = superjson;
