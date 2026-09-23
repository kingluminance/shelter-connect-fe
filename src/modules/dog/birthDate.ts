import type { BirthDatePrecision } from './types';

// docs/data-model.md "생일 표시 규칙" — birthDate is a storage anchor, not a real
// date, so the display text must match the stored precision exactly.
export function formatBirthDate(profile: {
  birthDate: string | null;
  birthDatePrecision: BirthDatePrecision;
  birthDateEstimated: boolean | null;
}): string {
  const { birthDate, birthDatePrecision, birthDateEstimated } = profile;
  if (!birthDate || birthDatePrecision === 'UNKNOWN') {
    return '생일을 아직 몰라요';
  }
  const [year, month, day] = birthDate.split('-').map(Number);
  const suffix = birthDateEstimated ? ' 추정' : '';
  if (birthDatePrecision === 'YEAR') {
    return `${year}년생${suffix}`;
  }
  if (birthDatePrecision === 'MONTH') {
    return `${year}년 ${month}월생${suffix}`;
  }
  return `${year}년 ${month}월 ${day}일${suffix}`;
}
