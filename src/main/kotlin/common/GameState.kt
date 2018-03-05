package common

import java.io.Serializable
object GameState:Serializable{
    val WIDTH = 25
    val HEIGHT = 25

    private val board = Array(WIDTH) {
        Array<BattleUnit?>(HEIGHT) { null }
    }

    @Synchronized operator fun get(row: Int, col: Int): BattleUnit? {
        if (row < 0 || row >= WIDTH || col < 0 || col >= HEIGHT) {
            throw IndexOutOfBoundsException()
        }

        return board[row][col]
    }

    @Synchronized operator fun set(row: Int, col: Int, battleUnit: BattleUnit?) {
        if (row < 0 || row >= WIDTH || col < 0 || col >= HEIGHT) {
            throw IndexOutOfBoundsException()
        }

        board[row][col] = battleUnit
    }
}