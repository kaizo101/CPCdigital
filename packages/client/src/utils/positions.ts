import type { Player, PublicGameState } from '@cpc/shared'

export function getSeatPosition(index: number, count: number): { left: string; top: string; width: number } {
  const presets: Record<number, { left: string; top: string; width: number }[]> = {
    1: [{ left: '50%', top: '100%', width: 216 }],
    2: [
      { left: '50%', top: '100%', width: 216 },
      { left: '50%', top: '0%',   width: 196 },
    ],
    3: [
      { left: '50%',   top: '100%', width: 216 },
      { left: '6.7%',  top: '25%',  width: 196 },
      { left: '93.3%', top: '25%',  width: 196 },
    ],
    4: [
      { left: '50%',  top: '100%', width: 216 },
      { left: '2.5%', top: '50%',  width: 196 },
      { left: '50%',  top: '0%',   width: 196 },
      { left: '97.5%', top: '50%', width: 196 },
    ],
    5: [
      { left: '50%',   top: '100%', width: 216 },
      { left: '2.4%',  top: '65.5%', width: 196 },
      { left: '20.6%', top: '9.5%',  width: 196 },
      { left: '79.4%', top: '9.5%',  width: 196 },
      { left: '97.6%', top: '65.5%', width: 196 },
    ],
    6: [
      { left: '50%',   top: '100%', width: 216 },
      { left: '6.7%',  top: '75%',  width: 196 },
      { left: '6.7%',  top: '25%',  width: 196 },
      { left: '50%',   top: '0%',   width: 196 },
      { left: '93.3%', top: '25%',  width: 196 },
      { left: '93.3%', top: '75%',  width: 196 },
    ],
    7: [
      { left: '50%',   top: '100%', width: 216 },
      { left: '10.9%', top: '81.2%', width: 196 },
      { left: '2.5%',  top: '38.9%', width: 196 },
      { left: '28.3%', top: '4.9%',  width: 196 },
      { left: '71.7%', top: '4.9%',  width: 196 },
      { left: '97.5%', top: '38.9%', width: 196 },
      { left: '89.1%', top: '81.2%', width: 196 },
    ],
    8: [
      { left: '50%',   top: '100%', width: 216 },
      { left: '14.6%', top: '85.4%', width: 196 },
      { left: '2.5%',  top: '50%',   width: 196 },
      { left: '14.6%', top: '14.6%', width: 196 },
      { left: '50%',   top: '0%',    width: 196 },
      { left: '85.4%', top: '14.6%', width: 196 },
      { left: '97.5%', top: '50%',   width: 196 },
      { left: '85.4%', top: '85.4%', width: 196 },
    ],
    9: [
      { left: '50%',   top: '100%', width: 216 },
      { left: '17.9%', top: '88.3%', width: 196 },
      { left: '4%',    top: '58.7%', width: 196 },
      { left: '6.7%',  top: '25%',   width: 196 },
      { left: '32.9%', top: '3.1%',  width: 196 },
      { left: '67.1%', top: '3.1%',  width: 196 },
      { left: '93.3%', top: '25%',   width: 196 },
      { left: '96%',   top: '58.7%', width: 196 },
      { left: '82.1%', top: '88.3%', width: 196 },
    ],
  }
  const positions = presets[count] ?? presets[9]
  return positions[index] ?? positions[positions.length - 1]
}

export function isOppositeHeroSeat(index: number, count: number): boolean {
  return getSeatPosition(index, count).top === '0%'
}

export function getBetPosition(index: number, count: number): { left: string; top: string } {
  const presets: Record<number, { left: string; top: string }[]> = {
    1: [{ left: '50%', top: '77.5%' }],
    2: [
      { left: '50%', top: '77.5%' },
      { left: '50%', top: '22.5%' },
    ],
    3: [
      { left: '50%',   top: '77.5%' },
      { left: '26.2%', top: '36.3%' },
      { left: '73.8%', top: '36.3%' },
    ],
    4: [
      { left: '50%',   top: '77.5%' },
      { left: '22.5%', top: '50%' },
      { left: '50%',   top: '22.5%' },
      { left: '77.5%', top: '50%' },
    ],
    5: [
      { left: '50%',   top: '77.5%' },
      { left: '23.8%', top: '58.5%' },
      { left: '33.8%', top: '27.7%' },
      { left: '66.2%', top: '27.7%' },
      { left: '76.2%', top: '58.5%' },
    ],
    6: [
      { left: '50%',   top: '77.5%' },
      { left: '26.2%', top: '63.8%' },
      { left: '26.2%', top: '36.3%' },
      { left: '50%',   top: '22.5%' },
      { left: '73.8%', top: '36.3%' },
      { left: '73.8%', top: '63.8%' },
    ],
    7: [
      { left: '50%',   top: '77.5%' },
      { left: '28.5%', top: '67.2%' },
      { left: '23.2%', top: '43.9%' },
      { left: '38.1%', top: '25.2%' },
      { left: '61.9%', top: '25.2%' },
      { left: '76.8%', top: '43.9%' },
      { left: '71.5%', top: '67.2%' },
    ],
    8: [
      { left: '50%',   top: '77.5%' },
      { left: '30.6%', top: '69.4%' },
      { left: '22.5%', top: '50%' },
      { left: '30.6%', top: '30.6%' },
      { left: '50%',   top: '22.5%' },
      { left: '69.4%', top: '30.6%' },
      { left: '77.5%', top: '50%' },
      { left: '69.4%', top: '69.4%' },
    ],
    9: [
      { left: '50%',   top: '77.5%' },
      { left: '32.3%', top: '71.1%' },
      { left: '22.9%', top: '54.8%' },
      { left: '26.2%', top: '36.2%' },
      { left: '40.6%', top: '24.2%' },
      { left: '59.4%', top: '24.2%' },
      { left: '73.8%', top: '36.2%' },
      { left: '77.1%', top: '54.8%' },
      { left: '67.7%', top: '71.1%' },
    ],
  }
  const positions = presets[count] ?? presets[9]
  return positions[index] ?? positions[positions.length - 1]
}

export function getTableButtonPosition(index: number, count: number): { left: string; top: string } {
  const betPosition = getBetPosition(index, count)
  const seatPosition = getSeatPosition(index, count)
  const betLeft = Number.parseFloat(betPosition.left)
  const betTop = Number.parseFloat(betPosition.top)
  const seatLeft = Number.parseFloat(seatPosition.left)
  const seatTop = Number.parseFloat(seatPosition.top)

  // Move outward from the bet stack towards the player while retaining enough
  // space for hole cards and keeping the buttons visibly on the felt.
  const towardsSeat = 0.42
  const left = betLeft + ((seatLeft - betLeft) * towardsSeat)
  const top = betTop + ((seatTop - betTop) * towardsSeat)
  return {
    left: `${Math.round(left * 100) / 100}%`,
    top: `${Math.round(top * 100) / 100}%`,
  }
}

export type TableButtonLabel = 'D'

export function getTableButtonAssignments(state: Readonly<PublicGameState>): Readonly<Record<string, TableButtonLabel[]>> {
  const inHandPlayers = state.players.filter(player => player.status !== 'waiting')
  if (inHandPlayers.length < 2) return {}

  const dealer = state.players[state.dealerIndex]
  const dealerIndex = inHandPlayers.findIndex(player => player.id === dealer?.id)
  if (dealerIndex < 0) return {}

  return {
    [inHandPlayers[dealerIndex].id]: ['D'],
  }
}

export function rotatePlayersForTable(players: Player[], myPlayerId?: string): Player[] {
  const ordered = [...players].sort((a, b) => a.seatIndex - b.seatIndex)
  if (!myPlayerId) return ordered
  const myIndex = ordered.findIndex(player => player.id === myPlayerId)
  if (myIndex <= 0) return ordered
  return [...ordered.slice(myIndex), ...ordered.slice(0, myIndex)]
}
