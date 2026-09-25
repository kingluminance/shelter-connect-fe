/** RN / Canvas renderer independent helpers. Units: ms, tiles, source-image pixels. */
export type Action = 'IDLE'|'WALK'|'RUN'|'SNIFF'|'TAIL_WAG'|'BACK_OFF'|'SIT'|'LIE_DOWN';
export type Frame = {x:number; y:number; width:number; height:number; durationMs:number};
export type Clip = {frames:Frame[]; loop:boolean; holdLastFrame:boolean; returnToIdle:'DIRECT'|'REVERSE_FRAMES'};
export type Vec2 = {x:number;y:number};
export const DEFAULT_SPEED: Record<Action,number> = {IDLE:0,WALK:.8,RUN:1.8,SNIFF:0,TAIL_WAG:0,BACK_OFF:.6,SIT:0,LIE_DOWN:0};
export const FRAME_SIZE = {width:64,height:64} as const;
export const ANCHOR_PIXELS = {x:32,y:60} as const;

/** For one-shot poses: play forward, hold last; call reverseFrame after exit is requested. */
export function forwardFrame(clip:Clip,elapsedMs:number):number {
  const total=clip.frames.reduce((sum,f)=>sum+f.durationMs,0);
  if (!clip.frames.length || total<=0) throw new Error('Invalid animation');
  let remaining=Math.max(0,elapsedMs);
  if(clip.loop) remaining%=total;
  for(let i=0;i<clip.frames.length;i++) {
    if(remaining<clip.frames[i].durationMs) return i;
    remaining-=clip.frames[i].durationMs;
  }
  return clip.frames.length-1;
}

/** Start from the current frame, including when interrupted during sitting/lying down. */
export function reverseFrame(clip:Clip,fromIndex:number,elapsedMs:number):{index:number;done:boolean} {
  let remaining=Math.max(0,elapsedMs);
  const start=Math.max(0,Math.min(clip.frames.length-1,Math.floor(fromIndex)));
  for(let i=start;i>=0;i--) {
    if(remaining<clip.frames[i].durationMs) return {index:i,done:false};
    remaining-=clip.frames[i].durationMs;
  }
  return {index:0,done:true};
}

/**
 * forward = facing/path vector. BACK_OFF keeps facing but moves in the opposite direction.
 * Pass settings.actions[action].speedTilesPerSecond when present. Do not derive speed from FPS.
 * Use a bounded fixed simulation step; pass zero after resuming from the background.
 * Collision/path checks must be applied by the app before accepting this proposed position.
 */
export function nextPosition(positionTiles:Vec2,forward:Vec2,action:Action,dtSeconds:number,speed=DEFAULT_SPEED[action]):Vec2 {
  if(!['WALK','RUN','BACK_OFF'].includes(action)) return {...positionTiles};
  const length=Math.hypot(forward.x,forward.y);
  if(!length || !Number.isFinite(length) || !Number.isFinite(dtSeconds) || !Number.isFinite(speed)) return {...positionTiles};
  const sign=action==='BACK_OFF'?-1:1;
  const distance=sign*Math.max(0,speed)*Math.max(0,dtSeconds);
  return {x:positionTiles.x+forward.x/length*distance,y:positionTiles.y+forward.y/length*distance};
}

/** Anchor is in source pixels. Scene zoom is a separate camera transform. */
export function spriteTopLeft(worldPixels:Vec2,spriteScale:number,anchor:Vec2=ANCHOR_PIXELS):Vec2 {
  return {x:worldPixels.x-anchor.x*spriteScale,y:worldPixels.y-anchor.y*spriteScale};
}

export function availableActions(assets:string[],weights:Partial<Record<Action,number>>):Action[] {
  return assets.filter((a):a is Action => Object.prototype.hasOwnProperty.call(DEFAULT_SPEED,a) && (weights[a as Action]??0)>0);
}

// source rectangle: clip.frames[index], not world coordinates.
// draw crop at spriteTopLeft(worldPixels, scale). For RN clipping, use overflow:'hidden'
// and sheet left=-frame.x*scale, top=-frame.y*scale inside the 64*scale square.
// Facing left may mirror the entire clipped frame around the same anchor.
// This set supplies one right-three-quarter direction, no dedicated up/down sprites.
