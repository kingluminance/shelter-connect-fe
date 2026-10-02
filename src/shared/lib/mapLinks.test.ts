import { mapUrl } from './mapLinks';

jest.mock('@react-native-clipboard/clipboard', () => ({ setString: jest.fn() }));

const withCoords = { label: '석사동 산책길 입구', latitude: 37.8, longitude: 127.7 };
const labelOnly = { label: '석사동 산책길 입구', latitude: null, longitude: null };

test('iOS: pin with coordinates, search by label without', () => {
  expect(mapUrl(withCoords, 'ios')).toBe(`http://maps.apple.com/?ll=37.8,127.7&q=${encodeURIComponent('석사동 산책길 입구')}`);
  expect(mapUrl(labelOnly, 'ios')).toBe(`http://maps.apple.com/?q=${encodeURIComponent('석사동 산책길 입구')}`);
});

test('Android: geo: URI with a labelled pin, search by label without coordinates', () => {
  expect(mapUrl(withCoords, 'android')).toContain('geo:37.8,127.7?q=37.8,127.7(');
  expect(mapUrl(labelOnly, 'android')).toBe(`geo:0,0?q=${encodeURIComponent('석사동 산책길 입구')}`);
});
