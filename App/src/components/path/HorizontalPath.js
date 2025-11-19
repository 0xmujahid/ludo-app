import {View} from 'react-native';
import React, {useMemo} from 'react';
import Cell from './Cell';

const HorizontalPath = React.memo(
  ({
    cells,
    playersColor,

    plottedPieces,
    currentTurn,
    diceValue,
    validMoves,
    selectedToken,
    isGamePaused,
    isMyTurn,
    onSelectToken,
    onMoveToken,
    userId,
  }) => {
    const cellsPerColumn = 3;
    const numberOfColumns = cells.length / cellsPerColumn;

    const groupedCellsByColumn = useMemo(() => {
      const groups = [];

      const cellsInEachColumn = cells.length / 6;
      for (let i = 0; i < 6; i++) {
        groups.push(
          cells.slice(i * cellsInEachColumn, (i + 1) * cellsInEachColumn),
        );
      }
      return groups;
    }, [cells]);

    return (
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          width: '40%',
          height: '100%',
        }}>
        {groupedCellsByColumn.map((columnCells, colIndex) => (
          <View
            key={`hpath-col-${colIndex}`}
            style={{
              flexDirection: 'column',
              width: `${100 / 6}%`,
              height: '100%',
            }}>
            {columnCells.map(id => (
              <View
                key={`cell-wrap-${id}`}
                style={{width: '100%', height: `${100 / cellsPerColumn}%`}}>
                <Cell
                  id={id}
                  playersColor={playersColor}
                  userId={userId}
                  plottedPieces={plottedPieces}
                  currentTurn={currentTurn}
                  diceValue={diceValue}
                  validMoves={validMoves}
                  selectedToken={selectedToken}
                  isGamePaused={isGamePaused}
                  isMyTurn={isMyTurn}
                  onSelectToken={onSelectToken}
                  onMoveToken={onMoveToken}
                />
              </View>
            ))}
          </View>
        ))}
      </View>
    );
  },
);

export default HorizontalPath;
