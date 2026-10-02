import { formatDistanceKm, houseKindFor, withRoParticle } from './shelterDisplay';

describe('houseKindFor', () => {
  test('maps the known map keys', () => {
    expect(houseKindFor('sunnyMeadow', 'x')).toBe('warmth');
    expect(houseKindFor('woodlandTrail', 'x')).toBe('starlight');
    expect(houseKindFor('lakesideRetreat', 'x')).toBe('lakeside');
  });

  test('unknown keys get a stable house from the name', () => {
    expect(houseKindFor('newMap', '다온 보호소')).toBe(houseKindFor('other', '다온 보호소'));
  });
});

describe('formatDistanceKm', () => {
  test('one decimal in km', () => {
    expect(formatDistanceKm(1234)).toBe('1.2 km');
    expect(formatDistanceKm(50)).toBe('0.1 km');
  });

  test('null without a reference point', () => {
    expect(formatDistanceKm(null)).toBeNull();
  });
});

describe('withRoParticle', () => {
  test('vowel-final and ㄹ-final take 로', () => {
    expect(withRoParticle('별빛 보호소')).toBe('별빛 보호소로');
    expect(withRoParticle('서울')).toBe('서울로');
  });

  test('other batchim takes 으로', () => {
    expect(withRoParticle('온기집')).toBe('온기집으로');
  });
});
