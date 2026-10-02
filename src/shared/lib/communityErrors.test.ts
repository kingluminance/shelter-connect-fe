import { ApiError } from './apiClient';
import { writeErrorMessage } from './communityErrors';

jest.mock('./supabase', () => ({ supabase: null }));

test('maps documented codes and statuses to Korean copy', () => {
  expect(writeErrorMessage(new ApiError('VERSION_CONFLICT', 'x', 'r', 409))).toContain('바뀌었어요');
  expect(writeErrorMessage(new ApiError('SIGHTINGS_CLOSED', 'x', 'r', 409))).toContain('마감');
  expect(writeErrorMessage(new ApiError('SOMETHING', 'x', 'r', 413))).toContain('5MB');
  expect(writeErrorMessage(new ApiError('SOMETHING', 'x', 'r', 415))).toContain('PNG');
  expect(writeErrorMessage(new ApiError('NETWORK_ERROR', 'x', ''))).toContain('인터넷');
});

test('unknown errors fall back to the server message', () => {
  expect(writeErrorMessage(new ApiError('OTHER', '서버 메시지', 'r', 400))).toBe('서버 메시지');
});
