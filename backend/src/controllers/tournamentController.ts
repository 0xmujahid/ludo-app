// @ts-nocheck
import { Request, Response } from 'express';
import * as tournamentService from '../services/tournamentService';
import { AuthenticatedRequest } from '../types/common';
import { TournamentFormat } from '../entities/Tournament';

export const createTournament = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, startTime, maxParticipants, entryFee, format } = req.body;
    const tournament = await tournamentService.createTournament({
      name,
      startTime,
      maxParticipants,
      entryFee,
      format: format as TournamentFormat,
    });
    res.status(201).json(tournament);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    res.status(400).json({ message: errorMessage });
  }
};

export const joinTournament = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }
    const { tournamentId } = req.params;
    const result = await tournamentService.joinTournament(tournamentId, userId);
    res.json(result);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    res.status(400).json({ message: errorMessage });
  }
};

export const getTournaments = async (req: Request, res: Response): Promise<void> => {
  try {
    const tournaments = await tournamentService.getAllTournaments();
    res.json(tournaments);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    res.status(500).json({ message: errorMessage });
  }
};

export const getTournamentDetails = async (req: Request, res: Response): Promise<void> => {
  try {
    const { tournamentId } = req.params;
    const tournament = await tournamentService.getTournamentById(tournamentId);
    res.json(tournament);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    res.status(404).json({ message: errorMessage });
  }
};

export const advanceTournament = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { tournamentId } = req.params;
    const { winnerId } = req.body;
    const updatedTournament = await tournamentService.advanceTournament(tournamentId, winnerId);
    res.json(updatedTournament);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    res.status(400).json({ message: errorMessage });
  }
};

export const getTournamentStandings = async (req: Request, res: Response): Promise<void> => {
  try {
    const { tournamentId } = req.params;
    const standings = await tournamentService.getTournamentStandings(tournamentId);
    res.json(standings);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    res.status(404).json({ message: errorMessage });
  }
};
