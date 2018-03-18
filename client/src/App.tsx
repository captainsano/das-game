import * as React from 'react';
import './App.css';
import Board, {DragonUnit, PlayerUnit, Unit} from './Board';

class App extends React.Component {
    handleKeyUp = (e: KeyboardEvent) => {
        switch (e.keyCode) {
            case 65:
                console.log('---> Attack');
                break;
            case 72:
                console.log('---> Heal');
                break;
            case 37:
                console.log('---> Left');
                break;
            case 38:
                console.log('---> Up');
                break;
            case 39:
                console.log('---> Right');
                break;
            case 40:
                console.log('---> Down');
                break;
            default:
                console.log('---> code: ', e.keyCode);
        }

    };

    componentWillMount() {
        document.addEventListener('keyup', this.handleKeyUp);
    }

    componentWillUnmount() {
        document.removeEventListener('keyup', this.handleKeyUp);
    }

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
                <div>
                    <h5 style={{marginBottom: '0.25em'}}>Controls:</h5>
                    <b>A</b> - Attack, <b>H</b> - Heal, <b>Up/Down/Left/Right</b> - Move
                </div>
                <br />
                <Board currentPlayerId={2} board={board}/>
            </div>
        );
    }
}

export default App;
