/**
 * Backend unit tests: auth (login/register) + userService utilities
 * Run with:  cd backend && npm test
 *
 * NOTE: These are isolated unit tests using mocked database calls.
 * Integration tests (Supertest) require a running MySQL server.
 */

const bcrypt = require('bcrypt');

// ─── Mock the pool so DB never really fires ──────────────────────────────────
jest.mock('../src/config/database', () => ({
  pool: {
    query: jest.fn(),
    getConnection: jest.fn(),
  }
}));

const { pool } = require('../src/config/database');
const userService = require('../src/services/userService');
const { AppError } = require('../src/middleware/errorHandler');

// ─── getUserProfile ───────────────────────────────────────────────────────────
describe('userService.getUserProfile', () => {
  afterEach(() => jest.clearAllMocks());

  it('returns the user when found', async () => {
    const fakeUser = { id: 1, email: 'a@b.com', full_name: 'Ali', role: 'CITIZEN', is_active: true };
    pool.query.mockResolvedValueOnce([[fakeUser]]);
    const result = await userService.getUserProfile(1);
    expect(result).toEqual(fakeUser);
    expect(pool.query).toHaveBeenCalledTimes(1);
  });

  it('throws 404 when user not found', async () => {
    pool.query.mockResolvedValueOnce([[]]); // empty result
    await expect(userService.getUserProfile(999)).rejects.toThrow('User not found');
  });
});

// ─── toggleUserActive ─────────────────────────────────────────────────────────
describe('userService.toggleUserActive', () => {
  afterEach(() => jest.clearAllMocks());

  it('flips is_active from true to false', async () => {
    const activeUser   = { id: 2, is_active: true };
    const updatedUser  = { id: 2, email: 'x@y.com', full_name: 'X', role: 'CITIZEN', is_active: false };
    pool.query
      .mockResolvedValueOnce([[activeUser]])  // SELECT current
      .mockResolvedValueOnce([{ affectedRows: 1 }]) // UPDATE
      .mockResolvedValueOnce([[updatedUser]]); // SELECT updated
    const result = await userService.toggleUserActive(2);
    expect(result.is_active).toBe(false);
  });

  it('throws 404 when user not found', async () => {
    pool.query.mockResolvedValueOnce([[]]); // empty result
    await expect(userService.toggleUserActive(999)).rejects.toThrow('User not found');
  });
});

// ─── getAllUsers ──────────────────────────────────────────────────────────────
describe('userService.getAllUsers', () => {
  afterEach(() => jest.clearAllMocks());

  it('returns array of users', async () => {
    const users = [
      { id: 1, full_name: 'Alice' },
      { id: 2, full_name: 'Bob' },
    ];
    pool.query.mockResolvedValueOnce([users]);
    const result = await userService.getAllUsers();
    expect(result).toHaveLength(2);
    expect(result[0].full_name).toBe('Alice');
  });
});

// ─── changePassword ───────────────────────────────────────────────────────────
describe('userService.changePassword', () => {
  afterEach(() => jest.clearAllMocks());

  it('rejects with 401 when current password is wrong', async () => {
    const hash = await bcrypt.hash('correctPwd', 10);
    pool.query.mockResolvedValueOnce([[{ id: 1, password_hash: hash }]]);
    await expect(userService.changePassword(1, 'wrongPwd', 'newPwd')).rejects.toThrow('Current password is incorrect');
  });

  it('succeeds when current password matches', async () => {
    const hash = await bcrypt.hash('myPwd', 10);
    pool.query
      .mockResolvedValueOnce([[{ id: 1, password_hash: hash }]]) // SELECT
      .mockResolvedValueOnce([{ affectedRows: 1 }]);              // UPDATE
    const ok = await userService.changePassword(1, 'myPwd', 'newSecurePwd!');
    expect(ok).toBe(true);
  });
});
