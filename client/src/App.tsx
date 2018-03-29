import * as React from 'react';
import './App.css';
import BoardComponent, {Board} from './Board';
import * as socketIO from 'socket.io-client';
import {Observable} from 'rxjs';

export function getRandomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1) + min);
}

const servers = [
    'localhost:8000',
    // 'localhost:8001',
    // 'localhost:8002',
    // 'localhost:8003',
    // 'localhost:8004',
];

class App extends React.Component {
    randomServer = `http://${servers[getRandomInt(0, servers.length - 1)]}`;
    socket = socketIO.connect(this.randomServer, {reconnection: false});

    state = {
        connected: false,
        unitId: parseInt(sessionStorage.getItem('UNIT_ID') || '-1'),
        timestamp: 0,
        board: null,
    };

    handleKeyUp = (e: KeyboardEvent) => {
        switch (e.keyCode) {
            case 65:
                this.socket.emit('MESSAGE', {
                    unitId: this.state.unitId,
                    action: 'ATTACK',
                    timestamp: this.state.timestamp
                });
                break;
            case 72:
                this.socket.emit('MESSAGE', {
                    unitId: this.state.unitId,
                    action: 'HEAL',
                    timestamp: this.state.timestamp
                });
                break;
            case 37:
                this.socket.emit('MESSAGE', {
                    unitId: this.state.unitId,
                    action: 'LEFT',
                    timestamp: this.state.timestamp
                });
                break;
            case 38:
                this.socket.emit('MESSAGE', {unitId: this.state.unitId, action: 'UP', timestamp: this.state.timestamp});
                break;
            case 39:
                this.socket.emit('MESSAGE', {
                    unitId: this.state.unitId,
                    action: 'RIGHT',
                    timestamp: this.state.timestamp
                });
                break;
            case 40:
                this.socket.emit('MESSAGE', {
                    unitId: this.state.unitId,
                    action: 'DOWN',
                    timestamp: this.state.timestamp
                });
                break;
        }
    };

    private connect() {
        this.randomServer = `http://${servers[getRandomInt(0, servers.length - 1)]}`;
        this.socket = socketIO.connect(this.randomServer, { reconnection: false });

        const socket = this.socket;

        socket.on('connect', () => {
            console.log(`---> Connected to: ${this.randomServer}`);

            this.setState({connected: true}, () => {
                // if (this.state.unitId === -1) {
                //     this.socket.emit('SPAWN', {}, (id: number) => {
                //         sessionStorage.setItem('UNIT_ID', id.toString());
                //         this.setState({unitId: id});
                //         this.socket.emit('MESSAGE', { action: 'PING', unitId: id, timestamp: this.state.timestamp })
                //     });
                // } else {
                //     this.socket.emit('RECONNECT', {id: this.state.unitId}, (id: number | null) => {
                //         if (id) {
                //             sessionStorage.setItem('UNIT_ID', id.toString());
                //             this.setState({unitId: id});
                //             this.socket.emit('MESSAGE', { action: 'PING', unitId: id, timestamp: this.state.timestamp })
                //         }
                //     });
                // }
            });

            // Start listening to game state
            socket.on('STATE_UPDATE', ({board, timestamp}: { board: Board, timestamp: number }) => {
                console.log('---> got state update');
                this.setState({board, timestamp});
            });

            socket.on('disconnect', () => {
                this.setState({connected: false});
                this.socket.off('STATE_UPDATE');
            });
        });
    }

    componentWillMount() {
        document.addEventListener('keyup', this.handleKeyUp);
    }

    componentWillUnmount() {
        document.removeEventListener('keyup', this.handleKeyUp);
    }

    componentDidMount() {
        Observable
            .interval(2500)
            .startWith(0)
            .filter(() => !this.state.connected)
            .subscribe(() => this.connect());
    }

    getDragonsCount() {
        if (this.state.board != null) {
            let dragonsCount = 0;
            for (let i = 0; i < (this.state.board! as Board).length; i++) {
                for (let j = 0; j < (this.state.board! as Board).length; j++) {
                    if (this.state.board![i][j] != null && this.state.board![i][j].type === 'dragon') {
                        dragonsCount += 1
                    }
                }
            }
            return dragonsCount
        }

        return -1;
    }

    render() {

        const board = this.state.board ? (
            <BoardComponent currentPlayerId={this.state.unitId} board={this.state.board!}/>
        ) : null
        
        const victoryMessage = (this.state.board && this.state.timestamp > 25 && this.getDragonsCount() === 0) ? (
            <div className="victory-message">
                <h3>Dragons are dead mate!</h3>
                <h4>Have some beer!</h4>
            </div>
        ) : null

        return (
            <div className="App">
                {/* <div>
                    <h5 style={{marginBottom: '0.25em'}}>Controls:</h5>
                    <b>A</b> - Attack, <b>H</b> - Heal, <b>Up/Down/Left/Right</b> - Move
                </div> */}
                <br/>
                <h4 style={{margin: '0.1em'}}>Connected?: {this.state.connected === true ? 'YES' : 'NO'} ({ this.randomServer })</h4>
                <h4 style={{margin: '0.1em'}}>Timestamp: {this.state.timestamp}</h4>
                <br/>
                {board}
                <br />
                {victoryMessage}
            </div>
        );
    }
}

export default App;
