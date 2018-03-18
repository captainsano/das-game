import * as React from 'react';

export interface Unit {
    id: number;
    maxHealth: number;
    health: number;
    attack: number;
    type: string;
}

export interface PlayerUnit extends Unit {
    type: 'player';
}

export interface DragonUnit extends Unit {
    type: 'dragon';
}

export interface Props {
    currentPlayerId: number;
    board: (Unit | null)[][];
}

const SQUARE_PIXEL_SIZE = 50;

class Board extends React.Component<Props> {
    render() {
        const squares = this.props.board.map((row, i) => {
            const rowElems = row.map((unit, j) => {
                const x = i * SQUARE_PIXEL_SIZE;
                const y = j * SQUARE_PIXEL_SIZE;
                const rectProps = {
                    x, y,
                    width: SQUARE_PIXEL_SIZE,
                    height: SQUARE_PIXEL_SIZE,
                    stroke: '#777777',
                    strokeWidth: 2,
                    opacity: unit ? unit.health / unit.maxHealth : 1.0,
                };

                const unitRect = (() => {
                    if (unit == null) {
                        return <rect {...rectProps} />;
                    } else if (unit.type === 'player') {
                        return <rect {...rectProps} fill="#00cc00"/>
                    } else if (unit.type === 'dragon') {
                        return <rect {...rectProps} fill="#cc0000"/>
                    }
                    return null;
                })();

                const innerCircle = unit && unit.id === this.props.currentPlayerId ? (
                    <circle
                        cx={x + SQUARE_PIXEL_SIZE * 0.5}
                        cy={y + SQUARE_PIXEL_SIZE * 0.5}
                        r={SQUARE_PIXEL_SIZE * 0.25}
                        fill="#fefefe"
                    />
                ) : null;

                return <g key={j}>{unitRect}{innerCircle}</g>;
            });

            return <g key={i}>{rowElems}</g>;
        });

        return (
            <svg width={500} height={500} fill="#fefefe">{squares}</svg>
        );
    }
}

export default Board;
