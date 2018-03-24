import * as React from 'react';

export interface Unit {
    id: number;
    maxHealth: number;
    health: number;
    attack: number;
    type: string;
}

export interface EmptyUnit extends Unit {
    type: 'EMPTY';
}

export interface KnightUnit extends Unit {
    type: 'KNIGHT';
}

export interface DragonUnit extends Unit {
    type: 'DRAGON';
}

export type Board = Unit[][];

export interface Props {
    currentPlayerId: number;
    board: Board;
}

const SQUARE_PIXEL_SIZE = 25;

class BoardComponent extends React.Component<Props> {
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
                    opacity: unit.health / unit.maxHealth,
                };

                const unitRect = (() => {
                    if (unit.type === 'EMPTY') {
                        return <rect {...rectProps} />;
                    } else if (unit.type === 'KNIGHT') {
                        return <rect {...rectProps} fill="#00cc00"/>
                    } else if (unit.type === 'DRAGON') {
                        return <rect {...rectProps} fill="#cc0000"/>
                    }
                    return null;
                })();

                const innerCircle = unit.id === this.props.currentPlayerId ? (
                    <circle
                        cx={x + SQUARE_PIXEL_SIZE * 0.5}
                        cy={y + SQUARE_PIXEL_SIZE * 0.5}
                        r={SQUARE_PIXEL_SIZE * 0.25}
                        fill="#777777"
                    />
                ) : null;

                return <g key={j}>{unitRect}{innerCircle}</g>;
            });

            return <g key={i}>{rowElems}</g>;
        });

        return (
            <svg width={this.props.board.length * SQUARE_PIXEL_SIZE}
                 height={this.props.board.length * SQUARE_PIXEL_SIZE}
                 fill="#fefefe"
            >{squares}</svg>
        );
    }
}

export default BoardComponent;
