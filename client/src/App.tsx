import * as React from 'react';
import './App.css';
import BoardComponent, {Board} from './Board';
import * as socketIO from 'socket.io-client';

class App extends React.Component {
    socket = socketIO.connect('localhost:8000');

    state = {
        connected: false,
        unitId: parseInt(sessionStorage.getItem('UNIT_ID') || '-1'),
        timestamp: 0,
        board: null,
    };

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

    componentDidMount() {
        console.log('---> CDM');
        this.socket.on('connect', () => {
            console.log('---> Connected');
            this.setState({connected: true}, () => {
                if (this.state.unitId === -1) {
                    this.socket.emit('SPAWN', {}, (id: number) => {
                        sessionStorage.setItem('UNIT_ID', id.toString());
                        this.setState({unitId: id});
                    });
                } else {
                    this.socket.emit('RECONNECT', {id: this.state.unitId}, (id: number | null) => {
                        if (id) {
                            sessionStorage.setItem('UNIT_ID', id.toString());
                            this.setState({unitId: id});
                        }
                    });
                }
            });

            // Start listening to game state
            this.socket.on('STATE_UPDATE', ({board, timestamp}: { board: Board, timestamp: number }) => {
                this.setState({board, timestamp});
            });
        });

        this.socket.on('disconnect', () => {
            console.log('---> Disconnected');
            this.setState({connected: false});
        });
    }

    render() {

        const board = this.state.board ? (
            <BoardComponent currentPlayerId={this.state.unitId} board={this.state.board!}/>
        ) : null;

        return (
            <div className="App">
                <div>
                    <h5 style={{marginBottom: '0.25em'}}>Controls:</h5>
                    <b>A</b> - Attack, <b>H</b> - Heal, <b>Up/Down/Left/Right</b> - Move
                </div>
                <br/>
                <h4 style={{margin: '0.1em'}}>Connected?: {this.state.connected === true ? 'YES' : 'NO'}</h4>
                <br/>
                {board}
            </div>
        );
    }
}

export default App;
