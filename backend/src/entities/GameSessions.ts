import { 
  Entity, 
  PrimaryGeneratedColumn,
  Column, 
  OneToMany, 
  OneToOne, 
  JoinColumn, 
  CreateDateColumn,
  UpdateDateColumn,
  Index 
} from 'typeorm';
import { GamePlayers } from './GamePlayers';
import { Game } from './Game';
import { TokenMove, GameState, GameStateCore, GameConfig, RoomConfig, GameStatus, GameVariant } from '../types/game';

interface PlayerState {
  pieces: number[];
  points: number;
  color: string;
  position: number;
  isActive: boolean;
  lastMoveTime?: Date;
  kills: number;
  timeRemaining: number;
  moveHistory: any[];
  userId: string;
  username: string;
  isReady: boolean;
  tokenPositions: number[];
  tokens: number[];
}

interface PlayerMove extends TokenMove {
  diceValue: number;
  capturedToken?: {
    playerId: string;
    tokenIndex: number;
  };
}

interface SessionState extends GameState {
  currentTurn: string;
  lastDiceRoll: number;
}

@Entity('game_sessions')
export class GameSessions {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid', { name: 'game_id' })
  @Index()
  gameId!: string;

  @Column({ type: 'int', default: 300 })
  timeLimit!: number;

  @Column('jsonb', { default: [] })
  moves!: PlayerMove[];

  @Column('jsonb', { default: {} })
  playerPositions!: Record<string, number>;

  @Column('jsonb', {
    default: {
      players: {},
      currentPlayer: '',
      diceRoll: 0,
      winner: null,
      gameStartTime: () => 'CURRENT_TIMESTAMP',
      lastMoveTime: () => 'CURRENT_TIMESTAMP',
      timePerMove: 30,
      status: GameStatus.WAITING,
      variant: GameVariant.CLASSIC,
      customRules: {
        skipTurnOnSix: false,
        multipleTokensPerSquare: false,
        safeZoneRules: 'standard',
        captureReward: 10,
        bonusTurnOnSix: true,
        timeoutPenalty: 5
      },
      consecutiveSixes: 0,
      moveHistory: [],
      specialSquares: {
        1: { type: 'safe' },
        9: { type: 'safe' },
        14: { type: 'safe' },
        22: { type: 'safe' },
        27: { type: 'safe' },
        35: { type: 'safe' },
        40: { type: 'safe' },
        48: { type: 'safe' },
        57: { type: 'home' }
      },
      maxMoves: 50,
      timeLimit: 300,
      turnTimeLimit: 30,
      moveCount: 0,
      pointsToWin: 100,
      roomCode: '',
      isPrivate: false,
      entryFee: 0,
      maxPlayers: 4,
      currentTurn: '',
      lastDiceRoll: 0
    }
  })
  state!: SessionState;

  @Column({ 
    type: 'enum', 
    enum: GameStatus, 
    default: GameStatus.WAITING 
  })
  status!: GameStatus;

  @Column({ 
    type: 'timestamp with time zone', 
    nullable: true 
  })
  startTime?: Date;

  @Column({ 
    type: 'timestamp with time zone', 
    nullable: true 
  })
  endTime?: Date;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt!: Date;

  @OneToOne(() => Game, game => game.session, {
    onDelete: 'CASCADE'
  })
  @JoinColumn({ name: 'game_id' })
  game!: Game;

  @OneToMany(() => GamePlayers, player => player.gameSession, {
    cascade: true,
    eager: true
  })
  players!: GamePlayers[];

  /**
   * Validates if a move is legal according to game rules
   */
  isValidMove(playerId: string, tokenIndex: number, diceValue: number): boolean {
    const playerState = this.state.players[playerId];
    if (!playerState) return false;

    const currentPosition = playerState.pieces[tokenIndex];
    const newPosition = currentPosition + diceValue;

    // Basic validation rules
    if (newPosition > 56) return false; // Cannot move beyond home
    if (currentPosition === 56) return false; // Token already home

    // Check if moving to an occupied square
    const isSquareOccupied = Object.values(this.state.players).some(state =>
      state.pieces.some(pos => pos === newPosition)
    );

    // Special square rules
    const targetSquare = this.state.specialSquares[newPosition];
    if (targetSquare) {
      if (targetSquare.type === 'safe' && isSquareOccupied) return false;
      if (targetSquare.type === 'home' && diceValue !== 6) return false;
    }

    return true;
  }
}