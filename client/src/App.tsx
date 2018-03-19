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
                this.socket.emit('MESSAGE', { action: 'ATTACK', timestamp: this.state.timestamp });
                break;
            case 72:
                this.socket.emit('MESSAGE', { action: 'HEAL', timestamp: this.state.timestamp });
                break;
            case 37:
                this.socket.emit('MESSAGE', { action: 'LEFT', timestamp: this.state.timestamp });
                break;
            case 38:
                this.socket.emit('MESSAGE', { action: 'UP', timestamp: this.state.timestamp });
                break;
            case 39:
                this.socket.emit('MESSAGE', { action: 'RIGHT', timestamp: this.state.timestamp });
                break;
            case 40:
                this.socket.emit('MESSAGE', { action: 'DOWN', timestamp: this.state.timestamp });
                break;
        }
    };

    componentWillMount() {
        document.addEventListener('keyup', this.handleKeyUp);
    }

    componentWillUnmount() {
        document.removeEventListener('keyup', this.handleKeyUp);
    }

    componentDidMount() {
        this.socket.on('connect', () => {
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
                console.log('---> received state update');
                this.setState({board, timestamp});
            });
        });

        this.socket.on('disconnect', () => {
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
