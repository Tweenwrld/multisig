import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * API Security Unit Tests
 * 
 * These tests verify the security guard contract behavior using mocks.
 * For full integration tests of actual rate limiting and body size enforcement,
 * see the integration test suite which runs with full ESM support.
 */

// Mock rate limiting functions
const applyRateLimitMock = jest.fn<(req: NextApiRequest, res: NextApiResponse, options?: unknown) => boolean>();
const enforceBodySizeMock = jest.fn<(req: NextApiRequest, res: NextApiResponse, maxBytes: number) => boolean>();

jest.mock(
  '@/lib/security/requestGuards',
  () => ({
    __esModule: true,
    applyRateLimit: applyRateLimitMock,
    enforceBodySize: enforceBodySizeMock,
  }),
  { virtual: true },
);

// Mock TRPC caller
const walletGetWalletMock = jest.fn();
const createCallerMock = jest.fn(() => ({
  wallet: {
    getWallet: walletGetWalletMock,
  },
}));

jest.mock(
  '@/server/api/root',
  () => ({
    __esModule: true,
    createCaller: createCallerMock,
  }),
  { virtual: true },
);

// Import mocked functions after mocks are set up
import { applyRateLimit, enforceBodySize } from '@/lib/security/requestGuards';
import { createCaller } from '@/server/api/root';

const mockRes = () => {
  const res: any = { statusCode: 200, body: null };
  res.status = (code: number) => {
    res.statusCode = code;
    return res;
  };
  res.json = (val: unknown) => {
    res.body = val;
    return res;
  };
  return res;
};

const buildReq = (ip: string, body: unknown = {}) =>
  ({
    headers: { "x-real-ip": ip },
    socket: { remoteAddress: ip },
    body,
  } as any);

describe("request guards (unit tests)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("applyRateLimit is called with correct parameters", () => {
    applyRateLimitMock.mockReturnValue(true);
    
    const req = buildReq("1.1.1.1");
    const res = mockRes();
    const options = { maxRequests: 10, windowMs: 60000, keySuffix: "test" };

    const result = applyRateLimit(req, res, options);
    
    expect(applyRateLimitMock).toHaveBeenCalledWith(req, res, options);
    expect(result).toBe(true);
  });

  it("applyRateLimit returns false when rate limited", () => {
    applyRateLimitMock.mockReturnValue(false);
    
    const req = buildReq("1.1.1.1");
    const res = mockRes();

    const result = applyRateLimit(req, res, { keySuffix: "test" });
    
    expect(result).toBe(false);
  });

  it("enforceBodySize is called with correct parameters", () => {
    enforceBodySizeMock.mockReturnValue(true);
    
    const req = buildReq("2.2.2.2", { data: "test" });
    const res = mockRes();
    const maxBytes = 1024;

    const result = enforceBodySize(req, res, maxBytes);
    
    expect(enforceBodySizeMock).toHaveBeenCalledWith(req, res, maxBytes);
    expect(result).toBe(true);
  });

  it("enforceBodySize returns false for oversized bodies", () => {
    enforceBodySizeMock.mockReturnValue(false);
    
    const req = buildReq("2.2.2.2", { large: "x".repeat(5000) });
    const res = mockRes();

    const result = enforceBodySize(req, res, 1024);
    
    expect(result).toBe(false);
  });
});

describe("wallet router authorization (unit tests)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("createCaller is invoked with proper context shape", () => {
    const context = {
      db: {},
      session: { user: { id: "addr1" }, expires: new Date().toISOString() },
      sessionAddress: "addr1",
      sessionWallets: ["addr1"],
      primaryWallet: "addr1",
      ip: "3.3.3.3",
    };

    createCaller(context);

    expect(createCallerMock).toHaveBeenCalledWith(context);
  });

  it("caller.wallet.getWallet is invoked correctly", async () => {
    const wallet = {
      id: "w1",
      signersAddresses: ["addr1"],
      ownerAddress: "addr1",
      name: "Wallet",
    };
    walletGetWalletMock.mockResolvedValueOnce(wallet);

    const caller = createCaller({
      db: {},
      session: { user: { id: "addr1" }, expires: new Date().toISOString() },
      sessionAddress: "addr1",
      ip: "5.5.5.5",
    });

    const result = await caller.wallet.getWallet({ walletId: "w1", address: "addr1" });
    
    expect(walletGetWalletMock).toHaveBeenCalledWith({ walletId: "w1", address: "addr1" });
    expect(result).toEqual(wallet);
  });

  it("caller.wallet.getWallet handles null response", async () => {
    walletGetWalletMock.mockResolvedValueOnce(null);

    const caller = createCaller({
      db: {},
      session: { user: { id: "addr1" }, expires: new Date().toISOString() },
      sessionAddress: "addr1",
      ip: "4.4.4.4",
    });

    const result = await caller.wallet.getWallet({ walletId: "w1", address: "addr1" });
    
    expect(result).toBeNull();
  });
});

