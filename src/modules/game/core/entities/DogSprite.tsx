import { Group, Oval, RoundedRect } from '@shopify/react-native-skia';
import { SpriteFrame } from './SpriteFrame';
import { forwardFrame, reverseFrame, selectDirectionalClip } from '../systems/spritePlayback';
import type { DogAgent, DogState } from '../systems/dogStateMachine';
import type { DogSheets } from '../assets/loadDogSheets';
import type { DogAssetManifest, DogSpriteDirection } from '../../../dog/types';

interface DogSpriteProps {
  dog: DogAgent;
  /** This dog's asset manifest (its own /assets one, or the bundled real-v1 stand-in). */
  manifest: DogAssetManifest;
  /** Every sheet `manifest` references, preloaded by loadDogSheets (url → image). */
  sheets: DogSheets;
  /** Ball-play borrows SNIFF/IDLE poses while a throw is in progress — when set, render
   * this instead of `dog.state`/its sub-phase (a pose override never has reverse-playback
   * timing of its own, so it just rides the shared env clock like any other loop). */
  renderStateOverride?: DogState;
  /** 4-way facing (docs/map-dog-sprites.md) — picks that direction's own art when the
   * manifest has it, else LEFT mirrors RIGHT's. */
  direction: DogSpriteDirection;
  /** The shared 8-step environment clock (250ms/step) — used for looping actions instead
   * of a from-scratch per-dog timer, and to pulse the skeleton. */
  envAnimFrame: number;
  /** Screen-space ground/foot position — NOT a top-left corner (anchored by the manifest's
   * `anchorPixels`). */
  groundX: number;
  groundY: number;
  size: number;
}

/**
 * Renders one dog frame from its per-action manifest (docs/dog-action-playback-spec.md,
 * docs/map-dog-sprites.md). If the sheet it needs isn't there (failed to load), draws a
 * grey skeleton dog instead of some other dog's art.
 */
export function DogSprite({
  dog,
  manifest,
  sheets,
  renderStateOverride,
  direction,
  envAnimFrame,
  groundX,
  groundY,
  size,
}: DogSpriteProps) {
  const state = renderStateOverride ?? dog.state;
  const selected = selectDirectionalClip(manifest, state, direction);
  const sheet = selected ? sheets[selected.clip.spritesheetUrl] : null;

  if (!selected || !sheet) {
    return <DogSkeleton groundX={groundX} groundY={groundY} size={size} envAnimFrame={envAnimFrame} />;
  }

  const clip = selected.clip;
  // Only SIT/LIE_DOWN ever set subPhase, and neither substitutes a different action —
  // `clip` here is that action's own art (a directional copy has the same frame timing
  // as the `animations` clip dogStateMachine.ts computed dog.subPhase etc. against).
  const isOwnState = renderStateOverride === undefined;
  let frameIndex: number;
  if (isOwnState && dog.subPhase === 'REVERSE') {
    frameIndex = reverseFrame(clip, dog.reverseFromFrame, dog.clipElapsedMs).index;
  } else if (isOwnState && dog.subPhase === 'ENTER') {
    frameIndex = forwardFrame(clip, dog.clipElapsedMs);
  } else if (isOwnState && dog.subPhase === 'HOLD') {
    frameIndex = clip.frames.length - 1;
  } else {
    // A plain looping action (or a ball-play pose override, which has no elapsed-time
    // tracking of its own) — ride the shared env clock converted to ms.
    frameIndex = forwardFrame(clip, envAnimFrame * (clip.frames[0]?.durationMs ?? 1));
  }
  const scale = size / manifest.frameSize.width;
  const frame = clip.frames[frameIndex];
  // Every clip now points into one per-dog atlas (rows aren't on a frameSize pitch — the
  // 32px base frames sit on top), so place by the frame's own x/y; fractional col/row is fine.
  return (
    <SpriteFrame
      sheet={sheet}
      frameSize={manifest.frameSize.width}
      col={frame.x / manifest.frameSize.width}
      row={frame.y / manifest.frameSize.height}
      x={groundX - manifest.anchorPixels.x * scale}
      y={groundY - manifest.anchorPixels.y * scale}
      size={size}
      flipX={selected.flipX}
    />
  );
}

/** Grey, gently pulsing dog-shaped blob (body + head + ground shadow) standing on the ground point. */
function DogSkeleton({ groundX, groundY, size, envAnimFrame }: { groundX: number; groundY: number; size: number; envAnimFrame: number }) {
  const opacity = 0.35 + 0.15 * Math.sin((envAnimFrame / 8) * Math.PI * 2);
  const body = { w: size * 0.5, h: size * 0.3 };
  const head = size * 0.26;
  return (
    <Group opacity={opacity}>
      <Oval x={groundX - size * 0.3} y={groundY - size * 0.06} width={size * 0.6} height={size * 0.12} color="#00000055" />
      <RoundedRect x={groundX - body.w / 2} y={groundY - body.h} width={body.w} height={body.h} r={body.h / 2} color="#c9c4cf" />
      <RoundedRect x={groundX + body.w / 2 - head * 0.7} y={groundY - body.h - head * 0.7} width={head} height={head} r={head / 3} color="#c9c4cf" />
    </Group>
  );
}
