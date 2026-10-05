import { Footprints, Hand, House } from 'lucide-react-native';

export interface ConsoleTopic {
  key: 'walk' | 'alone' | 'greet';
  Icon: typeof Footprints;
  /** LCD chip */
  label: string;
  /** chat window chip */
  chatLabel: string;
  /** what is sent to the dog when the topic is opened for the first time */
  prompt: string;
}

export const TOPICS: ConsoleTopic[] = [
  { key: 'walk', Icon: Footprints, label: '산책', chatLabel: '산책', prompt: '산책은 어때?' },
  { key: 'alone', Icon: House, label: '혼자', chatLabel: '혼자 있을 때', prompt: '혼자 있어도 괜찮아?' },
  { key: 'greet', Icon: Hand, label: '첫 만남', chatLabel: '첫 만남', prompt: '낯선 사람은 어때?' },
];

/** D-pad / chip movement wraps around. */
export function nextTopic(index: number, step: number, count: number = TOPICS.length): number {
  return (((index + step) % count) + count) % count;
}

/** "산책 이야기를 시작해" for a new topic, "산책 다시 보기" for one already asked. */
export function topicHint(topic: ConsoleTopic, asked: boolean): string {
  return asked ? `${topic.label} 다시 보기` : `${topic.label} 이야기를 시작해`;
}
