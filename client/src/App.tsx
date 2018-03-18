import * as React from 'react';
import './App.css';
import Board, { DragonUnit, PlayerUnit, Unit } from './Board';

class App extends React.Component {
    render() {
        const pu: PlayerUnit = {
            id: 1,
            health: 50,
            maxHealth: 50,
            attack: 10,
            type: 'player'
        };

        const du: DragonUnit = {
            id: 2,
            health: 50,
            maxHealth: 50,
            attack: 10,
            type: 'dragon'
        };

        const board: (Unit | null)[][] = [
            [{...pu, id: 1}, null, null, null, null],
            [null, null, {...du, id: 2}, null, null],
            [null, null, null, null, null],
            [null, {...du, id: 3}, null, {...pu, id: 4}, null],
            [null, null, null, null, null],
        ];

        return (
            <div className="App">
                <Board currentPlayerId={2} board={board} />
            </div>
        );
    }
}

export default App;
