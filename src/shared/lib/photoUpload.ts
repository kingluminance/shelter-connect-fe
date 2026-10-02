import { launchImageLibrary } from 'react-native-image-picker';
import { apiFetch } from './apiClient';
import { generateClientMessageId } from './clientId';

export interface PickedPhoto {
  uri: string;
  fileName: string;
  type: string;
}

export type PickResult =
  | { status: 'picked'; photos: PickedPhoto[] }
  | { status: 'cancelled' }
  // 사진 접근 거부(Figma 22 시트) / 그 외 실패
  | { status: 'denied' }
  | { status: 'error'; message: string };

// Gallery only (iOS PHPicker / Android photo picker — no album permission prompt). Resizing
// to 2048px re-encodes to JPEG, which also strips EXIF and keeps files well under the 5MiB cap
// (community-api.md: PNG/JPEG ≤ 5MiB, ≤ 16MP).
export async function pickPhotos(limit: number): Promise<PickResult> {
  const result = await launchImageLibrary({
    mediaType: 'photo',
    selectionLimit: limit,
    maxWidth: 2048,
    maxHeight: 2048,
    quality: 0.8,
    assetRepresentationMode: 'compatible',
  });
  if (result.didCancel) {
    return { status: 'cancelled' };
  }
  if (result.errorCode === 'permission') {
    return { status: 'denied' };
  }
  if (result.errorCode) {
    return { status: 'error', message: result.errorMessage ?? '사진을 불러오지 못했어요.' };
  }
  const photos = (result.assets ?? [])
    .filter(asset => !!asset.uri)
    .map(asset => ({ uri: asset.uri as string, fileName: asset.fileName ?? 'photo.jpg', type: asset.type ?? 'image/jpeg' }));
  return photos.length ? { status: 'picked', photos } : { status: 'cancelled' };
}

/** `POST /v1/community/media` (multipart: clientRequestId + file) → media id to attach to a post,
 * sighting or inquiry message. The same `clientRequestId` makes a retry of one photo idempotent. */
export async function uploadCommunityPhoto(photo: PickedPhoto, clientRequestId: string = generateClientMessageId()): Promise<string> {
  const form = new FormData();
  form.append('clientRequestId', clientRequestId);
  // React Native's FormData accepts this {uri,name,type} file shape.
  form.append('file', { uri: photo.uri, name: photo.fileName, type: photo.type } as unknown as Blob);
  const { data } = await apiFetch<{ data: { id: string; state: string } }>('/v1/community/media', { method: 'POST', body: form });
  return data.id;
}
