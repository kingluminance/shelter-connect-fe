import { createDogAgent, tickDog, type DogPersonality } from './dogStateMachine';

const bounds = { left: 0, top: 0, right: 200, bottom: 200 };
const noObstacles: { x: number; y: number; w: number; h: number }[] = [];
const sociable: DogPersonality = { playfulness: 0.5, sociability: 0.9, energy: 0.5, likesBall: true };
const shy: DogPersonality = { playfulness: 0.5, sociability: 0.1, energy: 0.5, likesBall: false };

test('a sociable dog wags its tail when the player gets close', () => {
  const agent = createDogAgent(100, 100);
  const next = tickDog(agent, sociable, 0.1, { x: 105, y: 100 }, bounds, noObstacles);
  expect(next.state).toBe('TAIL_WAG');
});

test('a shy dog backs off when the player gets close', () => {
  const agent = createDogAgent(100, 100);
  const next = tickDog(agent, shy, 0.1, { x: 105, y: 100 }, bounds, noObstacles);
  expect(next.state).toBe('BACK_OFF');
});

test('standing idle for 10s settles into SIT', () => {
  let agent = createDogAgent(100, 100);
  agent = { ...agent, state: 'IDLE', decisionCooldown: 999 }; // block autonomous re-rolls
  const farPlayer = { x: -1000, y: -1000 };
  for (let i = 0; i < 150; i++) {
    agent = tickDog(agent, sociable, 0.1, farPlayer, bounds, noObstacles);
  }
  expect(agent.state).toBe('SIT');
});

test('leaves TAIL_WAG once the player walks away', () => {
  let agent = createDogAgent(100, 100);
  agent = tickDog(agent, sociable, 0.1, { x: 105, y: 100 }, bounds, noObstacles);
  expect(agent.state).toBe('TAIL_WAG');
  agent = tickDog(agent, sociable, 0.1, { x: -1000, y: -1000 }, bounds, noObstacles);
  expect(agent.state).toBe('IDLE');
});
