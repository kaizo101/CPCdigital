import { afterEach, describe, expect, it, vi } from 'vitest'
import { PokerGame } from '@cpc/poker-engine'
import type { Player } from '@cpc/shared'
import { DEFAULT_BOT_ROSTER } from '../bot-identities'
import { BotRebuyManager, getCashOutPolicy } from './bot-rebuy-manager'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('BotRebuyManager replacements', () => {
  it('updates the live seat name together with the replacement identity', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => null,
      setItem: () => undefined,
    })

    const oldIdentity = DEFAULT_BOT_ROSTER.identities[0]
    const players: Player[] = [
      {
        id: 'hero', name: 'You', role: 'player', chips: 2_000, seatIndex: 0,
        isConnected: true, isSittingOut: false, status: 'waiting', roundBet: 0,
      },
      {
        id: 'bot-0', name: oldIdentity.name, role: 'player', chips: 0, seatIndex: 1,
        isConnected: true, isSittingOut: true, status: 'waiting', roundBet: 0,
      },
    ]
    const game = new PokerGame(players, { bigBlind: 20, smallBlind: 10 })
    const identities = new Map([['bot-0', oldIdentity]])
    const playerNames = new Map([['hero', 'You'], ['bot-0', oldIdentity.name]])
    const manager = new BotRebuyManager(
      game,
      players,
      new Set(['bot-0']),
      identities,
      new Map(),
      new Map(),
      new Map(),
      new Map(),
      playerNames,
      2_000,
      true,
      undefined,
      () => 0,
    )

    manager.leftTableBots.add('bot-0')
    manager.processReplacements(1)

    const replacement = identities.get('bot-0')!
    const livePlayer = game.getPublicState().players.find(player => player.id === 'bot-0')!
    expect(replacement.id).not.toBe(oldIdentity.id)
    expect(players[1].name).toBe(replacement.name)
    expect(livePlayer.name).toBe(replacement.name)
    expect(livePlayer.chips).toBe(2_000)
    expect(livePlayer.isSittingOut).toBe(false)
    expect(playerNames.get('bot-0')).toBe(replacement.name)
  })

  it('cashes out every bot at its hard stack limit and replaces an urgent seat', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => null,
      setItem: () => undefined,
    })

    const identity = DEFAULT_BOT_ROSTER.identities[0]
    const policy = getCashOutPolicy(identity)
    const players: Player[] = [
      {
        id: 'hero', name: 'You', role: 'player', chips: 2_000, seatIndex: 0,
        isConnected: true, isSittingOut: false, status: 'waiting', roundBet: 0,
      },
      {
        id: 'bot-0', name: identity.name, role: 'player', chips: policy.hardThresholdBb * 20, seatIndex: 1,
        isConnected: true, isSittingOut: false, status: 'waiting', roundBet: 0,
      },
    ]
    const game = new PokerGame(players, { bigBlind: 20, smallBlind: 10 })
    const manager = new BotRebuyManager(
      game,
      players,
      new Set(['bot-0']),
      new Map([['bot-0', identity]]),
      new Map(),
      new Map(),
      new Map(),
      new Map(),
      new Map([['hero', 'You'], ['bot-0', identity.name]]),
      2_000,
      true,
      undefined,
      () => 0.99,
    )

    expect(manager.processCashOuts(1)).toBe('bot-0')
    expect(players[1].chips).toBe(0)
    expect(players[1].isSittingOut).toBe(true)
    expect(manager.leftTableBots.has('bot-0')).toBe(true)

    manager.processReplacements(1)
    expect(players[1].chips).toBe(2_000)
    expect(players[1].isSittingOut).toBe(false)
    expect(manager.leftTableBots.has('bot-0')).toBe(false)
  })

  it('keeps a soft-threshold winner until the minimum table stay is reached', () => {
    const identity = DEFAULT_BOT_ROSTER.identities[0]
    const policy = getCashOutPolicy(identity)
    const players: Player[] = [
      {
        id: 'hero', name: 'You', role: 'player', chips: 2_000, seatIndex: 0,
        isConnected: true, isSittingOut: false, status: 'waiting', roundBet: 0,
      },
      {
        id: 'bot-0', name: identity.name, role: 'player', chips: policy.softThresholdBb * 20, seatIndex: 1,
        isConnected: true, isSittingOut: false, status: 'waiting', roundBet: 0,
      },
    ]
    const game = new PokerGame(players, { bigBlind: 20, smallBlind: 10 })
    const manager = new BotRebuyManager(
      game,
      players,
      new Set(['bot-0']),
      new Map([['bot-0', identity]]),
      new Map(),
      new Map(),
      new Map(),
      new Map(),
      new Map(),
      2_000,
      true,
      undefined,
      () => 0,
    )

    expect(manager.processCashOuts(policy.minimumHands - 1)).toBeNull()
    expect(manager.processCashOuts(policy.minimumHands)).toBe('bot-0')
  })
})
