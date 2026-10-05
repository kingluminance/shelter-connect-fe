import { nextTopic, TOPICS, topicHint } from './topics';

describe('nextTopic', () => {
  it('wraps in both directions', () => {
    expect(nextTopic(0, -1)).toBe(2);
    expect(nextTopic(2, 1)).toBe(0);
    expect(nextTopic(1, 1)).toBe(2);
  });
});

describe('topicHint', () => {
  it('differs for a topic that was already asked', () => {
    expect(topicHint(TOPICS[0], false)).toBe('산책 이야기를 시작해');
    expect(topicHint(TOPICS[0], true)).toBe('산책 다시 보기');
  });
});
