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

export type Board = (Unit | null)[][];

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

                return <g key={j}>{unitRect}</g>;
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
