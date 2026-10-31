import test from 'node:test';
import assert from 'node:assert/strict';
import { createCrazyGamesBridge, isSdkHost, SDK_URL } from './crazygames-bridge.mjs';

function mockSdk(environment = 'crazygames') {
  const calls = [];
  let listener;
  const sdk = {
    environment,
    init: async () => { calls.push('init'); },
    game: {
      settings: { muteAudio: true },
      addSettingsChangeListener: cb => { listener = cb; },
      gameplayStart: () => { calls.push('start'); },
      gameplayStop: () => { calls.push('stop'); },
    },
    ad: {
      requestAd: (type, callbacks) => {
        calls.push('ad:' + type);
        callbacks.adStarted();
        callbacks.adFinished();
      },
    },
  };
  return { sdk, calls, change: settings => listener?.(settings) };
}

test('SDK is gated to CrazyGames and local QA, never an unrelated host', () => {
  assert.equal(isSdkHost('hakopita-m84e27.deed.page'), false);
  assert.equal(isSdkHost('evilcrazygames.com'), false);
  assert.equal(isSdkHost('crazygames.com.evil.org'), false);
  assert.equal(isSdkHost('www.crazygames.com'), true);
  assert.equal(isSdkHost('localhost'), true);
  assert.match(SDK_URL, /^https:\/\/sdk\.crazygames\.com\/crazygames-sdk-v3\.js$/);
});

test('independent site plays without loading any external SDK', async () => {
  let loads = 0;
  const bridge = createCrazyGamesBridge({
    hostname: 'hakopita-m84e27.deed.page',
    loadSdk: async () => { loads++; throw Error('must not load'); },
  });
  bridge.start();
  assert.equal(await bridge.init(), false);
  bridge.stop();
  assert.equal(loads, 0);
});

test('gameplay lifecycle starts after SDK initialization and stops only once', async () => {
  const { sdk, calls, change } = mockSdk();
  const mute = [];
  const bridge = createCrazyGamesBridge({
    hostname: 'www.crazygames.com', loadSdk: async () => sdk, onMute: value => mute.push(value),
  });
  bridge.start(); // Game is already running when SDK finishes loading.
  assert.equal(await bridge.init(), true);
  bridge.start(); bridge.stop(); bridge.stop(); bridge.start();
  assert.deepEqual(calls, ['init','start','stop','start']);
  change({ muteAudio: false });
  assert.deepEqual(mute, [true,false]);
});

test('no advertising without actual Full Launch approval or during gameplay', async () => {
  const { sdk, calls } = mockSdk();
  const bridge = createCrazyGamesBridge({
    hostname: 'www.crazygames.com', loadSdk: async () => sdk,
  });
  await bridge.init(); bridge.start();
  assert.equal(await bridge.midgameAd({ approved: true }), false);
  bridge.stop();
  assert.equal(await bridge.midgameAd({ approved: false }), false);
  assert.ok(!calls.some(x => x.startsWith('ad:')));
  let started = 0, finished = 0;
  assert.equal(await bridge.midgameAd({
    approved: true, onStart: () => {started++}, onFinish: () => {finished++},
  }), true);
  assert.equal(started, 1); assert.equal(finished, 1);
  assert.equal(calls.filter(x => x === 'ad:midgame').length, 1);
});

test('SDK failure or disabled environment cannot block standalone gameplay', async () => {
  const bad = createCrazyGamesBridge({
    hostname:'crazygames.com', loadSdk: async () => {throw Error('offline')},
  });
  bad.start(); assert.equal(await bad.init(), false); bad.stop();
  const { sdk } = mockSdk('disabled');
  const disabled = createCrazyGamesBridge({
    hostname:'crazygames.com', loadSdk: async () => sdk,
  });
  assert.equal(await disabled.init(), false);
  assert.equal(await disabled.midgameAd({approved:true}), false);
});

test('unfilled ads or SDK errors cannot strand round transitions', async () => {
  const { sdk } = mockSdk();
  sdk.ad.requestAd = (_, callbacks) => callbacks.adError(Error('unfilled'));
  const bridge = createCrazyGamesBridge({
    hostname:'crazygames.com', loadSdk: async () => sdk,
  });
  await bridge.init();
  let finished=0;
  assert.equal(await bridge.midgameAd({approved:true,onFinish:()=>finished++}), false);
  assert.equal(finished,1);
});
