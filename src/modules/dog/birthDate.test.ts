import { formatBirthDate } from './birthDate';

test('unknown precision (or missing date) shows the "don\'t know yet" text', () => {
  expect(formatBirthDate({ birthDate: null, birthDatePrecision: 'UNKNOWN', birthDateEstimated: null })).toBe(
    '생일을 아직 몰라요',
  );
});

test('YEAR precision, estimated', () => {
  expect(
    formatBirthDate({ birthDate: '2022-01-01', birthDatePrecision: 'YEAR', birthDateEstimated: true }),
  ).toBe('2022년생 추정');
});

test('MONTH precision, estimated', () => {
  expect(
    formatBirthDate({ birthDate: '2022-07-01', birthDatePrecision: 'MONTH', birthDateEstimated: true }),
  ).toBe('2022년 7월생 추정');
});

test('DAY precision, confirmed (not estimated) — no "추정" suffix', () => {
  expect(
    formatBirthDate({ birthDate: '2022-07-28', birthDatePrecision: 'DAY', birthDateEstimated: false }),
  ).toBe('2022년 7월 28일');
});

test('DAY precision, estimated — suffix still applies', () => {
  expect(
    formatBirthDate({ birthDate: '2022-07-28', birthDatePrecision: 'DAY', birthDateEstimated: true }),
  ).toBe('2022년 7월 28일 추정');
});
