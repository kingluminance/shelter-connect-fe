import {
  buildCreateBody,
  buildSightingBody,
  buildUpdateBody,
  cleanFeatures,
  emptyForm,
  emptySighting,
  hasContent,
  publishError,
  reportError,
  resolveRegion,
  sightingError,
  statusChoices,
} from './composeForm';

const now = new Date('2026-10-02T12:00:00Z');
const lost = () => ({
  ...emptyForm('LOST'),
  title: '흰 푸들을 찾아요',
  text: '어제 오후에 사라졌어요',
  placeLabel: '석사동 공원',
  occurredAt: new Date('2026-10-01T09:00:00Z'),
});

describe('publishError', () => {
  it('accepts a complete LOST post with a region from my 동네', () => {
    expect(publishError(lost(), '춘천시 석사동', now)).toBeNull();
  });
  it('requires title, text, place and time for LOST/FOUND', () => {
    expect(publishError({ ...lost(), title: ' ' }, '동', now)).toMatch('제목');
    expect(publishError({ ...lost(), text: '' }, '동', now)).toMatch('내용');
    expect(publishError({ ...lost(), placeLabel: '' }, '동', now)).toMatch('마지막으로 본 곳');
    expect(publishError({ ...lost(), occurredAt: null }, '동', now)).toMatch('날짜');
  });
  it('rejects a future time beyond the 5 minute slack', () => {
    expect(publishError({ ...lost(), occurredAt: new Date('2026-10-02T12:03:00Z') }, '동', now)).toBeNull();
    expect(publishError({ ...lost(), occurredAt: new Date('2026-10-02T12:10:00Z') }, '동', now)).toMatch('미래');
  });
  it('news needs a 동네, from the field or my 동네', () => {
    const news = { ...emptyForm('NEIGHBOR_NEWS'), title: 't', text: 'x' };
    expect(publishError(news, null, now)).toMatch('동네');
    expect(publishError(news, '석사동', now)).toBeNull();
    expect(publishError({ ...news, regionLabel: '후평동' }, null, now)).toBeNull();
  });
});

describe('resolveRegion', () => {
  it('prefers my 동네 for LOST/FOUND, falls back to the place', () => {
    expect(resolveRegion(lost(), '춘천시 석사동')).toBe('춘천시 석사동');
    expect(resolveRegion(lost(), null)).toBe('석사동 공원');
  });
  it('prefers the typed 동네 for news', () => {
    expect(resolveRegion({ ...emptyForm('NEIGHBOR_NEWS'), regionLabel: '후평동' }, '석사동')).toBe('후평동');
  });
});

describe('bodies', () => {
  it('create body carries location only for LOST/FOUND with coords optional', () => {
    const body = buildCreateBody({ ...lost(), latitude: 37.1, longitude: 127.2 }, 'PUBLISHED', 'req-1', '석사동');
    expect(body).toMatchObject({
      clientRequestId: 'req-1',
      category: 'LOST',
      publication: 'PUBLISHED',
      regionLabel: '석사동',
      location: { label: '석사동 공원', latitude: 37.1, longitude: 127.2, occurredAt: '2026-10-01T09:00:00.000Z' },
    });
    const news = buildCreateBody({ ...emptyForm('NEIGHBOR_NEWS'), title: 't', text: 'x', regionLabel: '동' }, 'DRAFT', 'req-2', null);
    expect(news).not.toHaveProperty('location');
  });
  it('a draft without a time omits the location instead of sending half of it', () => {
    expect(buildCreateBody({ ...lost(), occurredAt: null }, 'DRAFT', 'r', 'x')).not.toHaveProperty('location');
  });
  it('update body always sends version and the full content', () => {
    expect(buildUpdateBody(lost(), 3, '석사동')).toMatchObject({ version: 3, category: 'LOST', features: [], mediaIds: [] });
  });
});

describe('cleanFeatures', () => {
  it('trims, dedupes, caps length and count', () => {
    expect(cleanFeatures([' 흰색 ', '흰색', '', 'a'.repeat(30)])).toEqual(['흰색', 'a'.repeat(20)]);
    expect(cleanFeatures(Array.from({ length: 12 }, (_, i) => `f${i}`))).toHaveLength(8);
  });
});

describe('hasContent', () => {
  it('is false for an empty form', () => {
    expect(hasContent(emptyForm())).toBe(false);
    expect(hasContent({ ...emptyForm(), text: 'x' })).toBe(true);
  });
});

describe('sighting', () => {
  it('requires place and text', () => {
    expect(sightingError(emptySighting(), now)).toMatch('어디');
    const ok = { ...emptySighting(), placeLabel: '공원', text: '봤어요', occurredAt: new Date('2026-10-02T11:00:00Z') };
    expect(sightingError(ok, now)).toBeNull();
    expect(sightingError({ ...ok, text: 'a'.repeat(501) }, now)).toMatch('500');
  });
  it('builds a SIGHTING comment body', () => {
    const body = buildSightingBody({ ...emptySighting(), placeLabel: '공원', text: '봤어요', occurredAt: now }, 'rid');
    expect(body).toMatchObject({ kind: 'SIGHTING', text: '봤어요', mediaIds: [], location: { label: '공원', occurredAt: now.toISOString() } });
  });
});

describe('statusChoices / reportError', () => {
  it('only FOUND may be 인계', () => {
    expect(statusChoices('LOST').map(c => c.status)).toEqual(['ACTIVE', 'REUNITED', 'CLOSED']);
    expect(statusChoices('FOUND').map(c => c.status)).toContain('TRANSFERRED');
    expect(statusChoices('NEIGHBOR_NEWS').map(c => c.status)).toEqual(['ACTIVE', 'CLOSED']);
  });
  it('OTHER needs details', () => {
    expect(reportError(null, '')).toBeTruthy();
    expect(reportError('OTHER', ' ')).toBeTruthy();
    expect(reportError('SPAM', '')).toBeNull();
  });
});
