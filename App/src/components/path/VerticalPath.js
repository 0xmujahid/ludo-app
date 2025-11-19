import {View} from 'react-native';
import React, {useMemo} from 'react';
import Cell from './Cell';

const VerticalPath = React.memo(
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
    const cellsPerRow = 3;
    const numberOfRows = cells.length / cellsPerRow;

    const groupedCellsByRow = useMemo(() => {
      const groups = [];
      for (let i = 0; i < cells.length; i += cellsPerRow) {
        groups.push(cells.slice(i, i + cellsPerRow));
      }
      return groups;
    }, [cells]);

    return (
      <View
        style={{
          flexDirection: 'column',
          alignItems: 'center',
          width: '20%',
          height: '100%',
          justifyContent: 'center',
        }}>
        {groupedCellsByRow.map((rowCells, rowIndex) => (
          <View
            key={`vpath-row-${rowIndex}`}
            style={{
              flexDirection: 'row',
              width: '100%',
              height: `${100 / numberOfRows}%`,
            }}>
            {rowCells.map(id => (
              <View
                key={`cell-wrap-${id}`}
                style={{width: `${100 / cellsPerRow}%`, height: '100%'}}>
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

export default VerticalPath;
