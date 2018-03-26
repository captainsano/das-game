import { Store } from "redux";
import { GameState } from "./stateReducer";
import { getDistance, Square, Board } from "./util";
import { addToQueue, attackUnit } from "./actions";

const findNearestKnight = function findNearestKnight(board: Board, from: Square, maxDistance: number): Square | null {
    for (let i = 0; i < board.length; i++) {
        for (let j = 0; j < board.length; j++) {
            if (getDistance(from, [i, j]) <= maxDistance && board[i][j].type === 'KNIGHT') {
                return [i, j]
            }
        }
    }

    return null
}

export default function dragonsAttack(store: Store<GameState | undefined>) {
    const state = store.getState()!

    if (state) {
        // For each dragon, find nearest player and attack
        for (let i = 0; i < state.board.length; i++) {
            for (let j = 0; j < state.board.length; j++) {
                if (state.board[i][j].type === 'DRAGON') {
                    const nearestPlayerLocation = findNearestKnight(state.board, [i, j], 2)
                    if (nearestPlayerLocation) {
                        store.dispatch(addToQueue(state.timestamp, attackUnit(state.board[i][j].id, 'KNIGHT')))
                    }
                }
            }
        }
    }
}