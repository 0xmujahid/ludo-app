import { getRepository } from 'typeorm';
import { Tournament, TournamentFormat } from '../entities/Tournament';
import { User } from '../entities/User';
import * as walletService from './walletService';
import { PaymentMethod } from '../types/payment';
import * as webhookService from './webhookService';

export const createTournament = async (tournamentData: {
  name: string;
  startTime: Date;
  maxParticipants: number;
  entryFee: number;
  format: TournamentFormat;
}) => {
  const tournamentRepository = getRepository(Tournament);
  const tournament = tournamentRepository.create({
    ...tournamentData,
    prizePool: tournamentData.entryFee * tournamentData.maxParticipants,
  });

  tournament.brackets = generateInitialBrackets(tournamentData.format, tournamentData.maxParticipants);
  const savedTournament = await tournamentRepository.save(tournament);

  // Send webhook for tournament creation
  await webhookService.handleTournamentWebhook(savedTournament.id, {
    event: 'tournament_created',
    tournament: {
      id: savedTournament.id,
      name: savedTournament.name,
      format: savedTournament.format,
      startTime: savedTournament.startTime,
      maxParticipants: savedTournament.maxParticipants,
      entryFee: savedTournament.entryFee,
      prizePool: savedTournament.prizePool
    }
  });

  return savedTournament;
};

export const joinTournament = async (tournamentId: string, userId: string) => {
  const tournamentRepository = getRepository(Tournament);
  const userRepository = getRepository(User);

  const tournament = await tournamentRepository.findOne({ where: { id: tournamentId }, relations: ['participants'] });
  if (!tournament) {
    throw new Error('Tournament not found');
  }

  const user = await userRepository.findOne({ where: { id: userId } });
  if (!user) {
    throw new Error('User not found');
  }

  if (tournament.participants.length >= tournament.maxParticipants) {
    throw new Error('Tournament is full');
  }

  await walletService.withdrawFunds(userId, tournament.entryFee, PaymentMethod.SYSTEM);

  tournament.participants.push(user);
  tournament.brackets = updateBrackets(tournament.format, tournament.brackets, user);

  const updatedTournament = await tournamentRepository.save(tournament);

  // Send webhook for player join
  await webhookService.handleTournamentWebhook(tournamentId, {
    event: 'player_joined',
    tournamentId,
    player: {
      id: user.id,
      username: user.username
    },
    currentParticipants: tournament.participants.length,
    maxParticipants: tournament.maxParticipants,
    brackets: tournament.brackets
  });

  return updatedTournament;
};

export const getAllTournaments = async () => {
  const tournamentRepository = getRepository(Tournament);
  return tournamentRepository.find();
};

export const getTournamentById = async (tournamentId: string) => {
  const tournamentRepository = getRepository(Tournament);
  const tournament = await tournamentRepository.findOne({ where: { id: tournamentId }, relations: ['participants'] });
  if (!tournament) {
    throw new Error('Tournament not found');
  }
  return tournament;
};

export const getTournamentStandings = async (tournamentId: string) => {
  const tournamentRepository = getRepository(Tournament);
  const tournament = await tournamentRepository.findOne({ 
    where: { id: tournamentId }, 
    relations: ['participants'] 
  });

  if (!tournament) {
    throw new Error('Tournament not found');
  }

  const standings = calculateTournamentStandings(tournament);
  return standings;
};

interface Bracket {
  round: number;
  matches: Array<{ player1: string | null; player2: string | null; winner: string | null }>;
}

interface PlayerStanding {
  userId: string;
  username: string;
  wins: number;
  losses: number;
  points: number;
  rank: number;
}

function generateInitialBrackets(format: TournamentFormat, maxParticipants: number): any {
  switch (format) {
    case TournamentFormat.SINGLE_ELIMINATION:
      return generateSingleEliminationBrackets(maxParticipants);
    case TournamentFormat.DOUBLE_ELIMINATION:
      return generateDoubleEliminationBrackets(maxParticipants);
    case TournamentFormat.ROUND_ROBIN:
      return generateRoundRobinBrackets(maxParticipants);
    case TournamentFormat.SWISS:
      return generateSwissBrackets(maxParticipants);
    default:
      throw new Error('Invalid tournament format');
  }
}

function generateSingleEliminationBrackets(maxParticipants: number): Bracket[] {
  const rounds = Math.ceil(Math.log2(maxParticipants));
  const brackets: Bracket[] = [];
  
  for (let round = 1; round <= rounds; round++) {
    const matchesInRound = Math.pow(2, rounds - round);
    const matches = Array(matchesInRound).fill({ player1: null, player2: null, winner: null });
    brackets.push({ round, matches });
  }

  return brackets;
}

function generateDoubleEliminationBrackets(maxParticipants: number): { winners: Bracket[], losers: Bracket[] } {
  const winnersBrackets = generateSingleEliminationBrackets(maxParticipants);
  const losersBrackets: Bracket[] = [];

  for (let round = 1; round < winnersBrackets.length; round++) {
    const matchesInRound = Math.ceil(winnersBrackets[round - 1].matches.length / 2);
    const matches = Array(matchesInRound).fill({ player1: null, player2: null, winner: null });
    losersBrackets.push({ round, matches });
  }

  return { winners: winnersBrackets, losers: losersBrackets };
}

function generateRoundRobinBrackets(maxParticipants: number): Bracket[] {
  const rounds = maxParticipants - 1;
  const brackets: Bracket[] = [];

  for (let round = 1; round <= rounds; round++) {
    const matchesInRound = Math.floor(maxParticipants / 2);
    const matches = Array(matchesInRound).fill({ player1: null, player2: null, winner: null });
    brackets.push({ round, matches });
  }

  return brackets;
}

function generateSwissBrackets(maxParticipants: number): Bracket[] {
  const rounds = Math.ceil(Math.log2(maxParticipants));
  const brackets: Bracket[] = [];

  for (let round = 1; round <= rounds; round++) {
    const matchesInRound = Math.floor(maxParticipants / 2);
    const matches = Array(matchesInRound).fill({ player1: null, player2: null, winner: null });
    brackets.push({ round, matches });
  }

  return brackets;
}

function updateBrackets(format: TournamentFormat, brackets: any, user: User): any {
  switch (format) {
    case TournamentFormat.SINGLE_ELIMINATION:
      return updateSingleEliminationBrackets(brackets, user);
    case TournamentFormat.DOUBLE_ELIMINATION:
      return updateDoubleEliminationBrackets(brackets, user);
    case TournamentFormat.ROUND_ROBIN:
      return updateRoundRobinBrackets(brackets, user);
    case TournamentFormat.SWISS:
      return updateSwissBrackets(brackets, user);
    default:
      throw new Error('Invalid tournament format');
  }
}

function updateSingleEliminationBrackets(brackets: Bracket[], user: User): Bracket[] {
  const firstRound = brackets[0];
  const emptySlot = firstRound.matches.find(match => match.player1 === null || match.player2 === null);
  
  if (emptySlot) {
    if (emptySlot.player1 === null) {
      emptySlot.player1 = user.id;
    } else {
      emptySlot.player2 = user.id;
    }
  }

  return brackets;
}

function updateDoubleEliminationBrackets(brackets: { winners: Bracket[], losers: Bracket[] }, user: User): { winners: Bracket[], losers: Bracket[] } {
  brackets.winners = updateSingleEliminationBrackets(brackets.winners, user);
  return brackets;
}

function updateRoundRobinBrackets(brackets: Bracket[], user: User): Bracket[] {
  brackets.forEach(round => {
    round.matches.forEach(match => {
      if (match.player1 === null) {
        match.player1 = user.id;
      } else if (match.player2 === null && match.player1 !== user.id) {
        match.player2 = user.id;
      }
    });
  });

  return brackets;
}

function updateSwissBrackets(brackets: Bracket[], user: User): Bracket[] {
  const firstRound = brackets[0];
  const emptySlot = firstRound.matches.find(match => match.player1 === null || match.player2 === null);
  
  if (emptySlot) {
    if (emptySlot.player1 === null) {
      emptySlot.player1 = user.id;
    } else {
      emptySlot.player2 = user.id;
    }
  }

  return brackets;
}

export const advanceTournament = async (tournamentId: string, winnerId: string) => {
  const tournamentRepository = getRepository(Tournament);
  const tournament = await tournamentRepository.findOne({ where: { id: tournamentId }, relations: ['participants'] });
  if (!tournament) {
    throw new Error('Tournament not found');
  }

  const previousBrackets = JSON.parse(JSON.stringify(tournament.brackets)); // Deep copy for comparison
  tournament.brackets = updateBracketsWithWinner(tournament.format, tournament.brackets, winnerId);

  // Send webhook for match result
  await webhookService.handleTournamentWebhook(tournamentId, {
    event: 'match_completed',
    tournamentId,
    winner: winnerId,
    previousBrackets,
    updatedBrackets: tournament.brackets
  });

  if (isTournamentCompleted(tournament)) {
    tournament.endTime = new Date();
    await distributePrizes(tournament);

    // Send webhook for tournament completion
    await webhookService.handleTournamentWebhook(tournamentId, {
      event: 'tournament_completed',
      tournamentId,
      winner: winnerId,
      endTime: tournament.endTime,
      finalBrackets: tournament.brackets,
      prizePool: tournament.prizePool
    });
  }

  return tournamentRepository.save(tournament);
};

function updateBracketsWithWinner(format: TournamentFormat, brackets: any, winnerId: string): any {
  switch (format) {
    case TournamentFormat.SINGLE_ELIMINATION:
      return updateSingleEliminationWithWinner(brackets, winnerId);
    case TournamentFormat.DOUBLE_ELIMINATION:
      return updateDoubleEliminationWithWinner(brackets, winnerId);
    case TournamentFormat.ROUND_ROBIN:
      return updateRoundRobinWithWinner(brackets, winnerId);
    case TournamentFormat.SWISS:
      return updateSwissWithWinner(brackets, winnerId);
    default:
      throw new Error('Invalid tournament format');
  }
}

function updateSingleEliminationWithWinner(brackets: Bracket[], winnerId: string): Bracket[] {
  for (let i = 0; i < brackets.length - 1; i++) {
    const currentRound = brackets[i];
    const nextRound = brackets[i + 1];

    for (let j = 0; j < currentRound.matches.length; j++) {
      const match = currentRound.matches[j];
      if (match.player1 === winnerId || match.player2 === winnerId) {
        match.winner = winnerId;
        const nextMatchIndex = Math.floor(j / 2);
        const nextMatch = nextRound.matches[nextMatchIndex];
        if (nextMatch.player1 === null) {
          nextMatch.player1 = winnerId;
        } else {
          nextMatch.player2 = winnerId;
        }
        return brackets;
      }
    }
  }

  return brackets;
}

function updateDoubleEliminationWithWinner(brackets: { winners: Bracket[], losers: Bracket[] }, winnerId: string): { winners: Bracket[], losers: Bracket[] } {
  const updatedWinners = updateSingleEliminationWithWinner(brackets.winners, winnerId);
  
  if (updatedWinners === brackets.winners) {
    for (let i = 0; i < brackets.losers.length - 1; i++) {
      const currentRound = brackets.losers[i];
      const nextRound = brackets.losers[i + 1];

      for (let j = 0; j < currentRound.matches.length; j++) {
        const match = currentRound.matches[j];
        if (match.player1 === winnerId || match.player2 === winnerId) {
          match.winner = winnerId;
          const nextMatchIndex = Math.floor(j / 2);
          const nextMatch = nextRound.matches[nextMatchIndex];
          if (nextMatch.player1 === null) {
            nextMatch.player1 = winnerId;
          } else {
            nextMatch.player2 = winnerId;
          }
          return { winners: brackets.winners, losers: brackets.losers };
        }
      }
    }
  }

  return { winners: updatedWinners, losers: brackets.losers };
}

function updateRoundRobinWithWinner(brackets: Bracket[], winnerId: string): Bracket[] {
  for (const round of brackets) {
    for (const match of round.matches) {
      if (match.player1 === winnerId || match.player2 === winnerId) {
        match.winner = winnerId;
      }
    }
  }
  return brackets;
}

function updateSwissWithWinner(brackets: Bracket[], winnerId: string): Bracket[] {
  for (const round of brackets) {
    for (const match of round.matches) {
      if (match.player1 === winnerId || match.player2 === winnerId) {
        match.winner = winnerId;
      }
    }
  }
  return generateNextSwissRound(brackets);
}

function generateNextSwissRound(brackets: Bracket[]): Bracket[] {
  const players = getAllPlayers(brackets);
  const playerScores = calculatePlayerScores(brackets);
  const sortedPlayers = players.sort((a, b) => playerScores[b] - playerScores[a]);
  
  const newRound: Bracket = {
    round: brackets.length + 1,
    matches: []
  };

  for (let i = 0; i < sortedPlayers.length; i += 2) {
    if (i + 1 < sortedPlayers.length) {
      newRound.matches.push({
        player1: sortedPlayers[i],
        player2: sortedPlayers[i + 1],
        winner: null
      });
    } else {
      newRound.matches.push({
        player1: sortedPlayers[i],
        player2: null,
        winner: sortedPlayers[i]
      });
    }
  }

  return [...brackets, newRound];
}

function getAllPlayers(brackets: Bracket[]): string[] {
  const players = new Set<string>();
  for (const round of brackets) {
    for (const match of round.matches) {
      if (match.player1) players.add(match.player1);
      if (match.player2) players.add(match.player2);
    }
  }
  return Array.from(players);
}

function calculatePlayerScores(brackets: Bracket[]): { [playerId: string]: number } {
  const scores: { [playerId: string]: number } = {};
  for (const round of brackets) {
    for (const match of round.matches) {
      if (match.winner) {
        scores[match.winner] = (scores[match.winner] || 0) + 1;
      }
    }
  }
  return scores;
}

function calculateTournamentStandings(tournament: Tournament): PlayerStanding[] {
  const standings: PlayerStanding[] = [];
  const brackets = tournament.brackets;
  const playerStats = new Map<string, { wins: number; losses: number; points: number }>();

  tournament.participants.forEach(participant => {
    playerStats.set(participant.id, { wins: 0, losses: 0, points: 0 });
  });

  switch (tournament.format) {
    case TournamentFormat.SINGLE_ELIMINATION:
    case TournamentFormat.DOUBLE_ELIMINATION:
      calculateEliminationStandings(brackets, playerStats);
      break;
    case TournamentFormat.ROUND_ROBIN:
      calculateRoundRobinStandings(brackets, playerStats);
      break;
    case TournamentFormat.SWISS:
      calculateSwissStandings(brackets, playerStats);
      break;
  }

  Array.from(playerStats.entries()).forEach(([userId, stats]) => {
    const participant = tournament.participants.find(p => p.id === userId);
    if (participant) {
      standings.push({
        userId,
        username: participant.username,
        wins: stats.wins,
        losses: stats.losses,
        points: stats.points,
        rank: 0
      });
    }
  });

  standings.sort((a, b) => b.points - a.points || b.wins - a.wins);
  standings.forEach((standing, index) => {
    standing.rank = index + 1;
  });

  return standings;
}

function calculateEliminationStandings(
  brackets: any,
  playerStats: Map<string, { wins: number; losses: number; points: number }>
) {
  brackets.forEach((round: any) => {
    round.matches.forEach((match: any) => {
      if (match.winner) {
        const winner = playerStats.get(match.winner);
        const loser = playerStats.get(match.player1 === match.winner ? match.player2 : match.player1);
        
        if (winner) {
          winner.wins += 1;
          winner.points += 3;
        }
        if (loser) {
          loser.losses += 1;
          loser.points += 1;
        }
      }
    });
  });
}

function calculateRoundRobinStandings(
  brackets: any,
  playerStats: Map<string, { wins: number; losses: number; points: number }>
) {
  brackets.forEach((round: any) => {
    round.matches.forEach((match: any) => {
      if (match.winner) {
        const winner = playerStats.get(match.winner);
        const loser = playerStats.get(match.player1 === match.winner ? match.player2 : match.player1);
        
        if (winner) {
          winner.wins += 1;
          winner.points += 2;
        }
        if (loser) {
          loser.losses += 1;
          loser.points += 0;
        }
      }
    });
  });
}

function calculateSwissStandings(
  brackets: any,
  playerStats: Map<string, { wins: number; losses: number; points: number }>
) {
  brackets.forEach((round: any) => {
    round.matches.forEach((match: any) => {
      if (match.winner) {
        const winner = playerStats.get(match.winner);
        const loser = playerStats.get(match.player1 === match.winner ? match.player2 : match.player1);
        
        if (winner) {
          winner.wins += 1;
          winner.points += 2;
        }
        if (loser) {
          loser.losses += 1;
          loser.points += 0.5;
        }
      }
    });
  });
}

function isTournamentCompleted(tournament: Tournament): boolean {
  switch (tournament.format) {
    case TournamentFormat.SINGLE_ELIMINATION:
    case TournamentFormat.DOUBLE_ELIMINATION:
      return tournament.brackets[tournament.brackets.length - 1].matches[0].winner !== null;
    case TournamentFormat.ROUND_ROBIN:
      return tournament.brackets.length === tournament.participants.length - 1;
    case TournamentFormat.SWISS:
      return tournament.brackets.length >= Math.ceil(Math.log2(tournament.participants.length));
    default:
      return false;
  }
}

async function distributePrizes(tournament: Tournament): Promise<void> {
  const winner = tournament.participants.find(p => p.id === tournament.brackets[tournament.brackets.length - 1].matches[0].winner);
  if (winner) {
    const prizeAmount = tournament.prizePool * 0.9;
    await walletService.addFunds(winner.id, prizeAmount, PaymentMethod.SYSTEM, {
      description: 'Tournament prize money',
      currency: 'INR',
      orderId: `PRIZE_${tournament.id}_${Date.now()}`
    });

    // Send webhook for prize distribution
    await webhookService.handleTournamentWebhook(tournament.id, {
      event: 'prize_distributed',
      tournamentId: tournament.id,
      winner: {
        id: winner.id,
        username: winner.username
      },
      prizeAmount,
      timestamp: new Date()
    });
  }
}