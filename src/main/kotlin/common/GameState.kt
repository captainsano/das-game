package common

import java.io.Serializable
import java.util.*

object GameState : Serializable {
    val WIDTH = 5
    val HEIGHT = 5

    private var running = true

    private val board = Array(WIDTH) {
        Array<BattleUnit?>(HEIGHT) { null }
    }

    @Synchronized
    operator fun get(x: Int, y: Int): BattleUnit? {
        if (x < 0 || x >= WIDTH || y < 0 || y >= HEIGHT) {
            throw IndexOutOfBoundsException()
        }

        return board[x][y]
    }

    @Synchronized
    fun getBoard(): Array<Array<BattleUnit?>> {
        return board.clone()
    }

    @Synchronized
    fun stopRunning() {
        running = false
    }

    @Synchronized
    fun isRunning() = running

    @Synchronized
    fun update(newBoard: Array<Array<BattleUnit?>>) {
        for (x in 0 until WIDTH) {
            for (y in 0 until HEIGHT) {
                board[x][y] = newBoard[x][y]
            }
        }
    }

    /**
     * Spawn a unit at some random row column location and
     * return the location
     */
    @Synchronized
    fun spawnUnit(unit: BattleUnit) {
        while (true) {
            val randomX = (Math.random() * WIDTH).toInt()
            val randomY = (Math.random() * HEIGHT).toInt()

            if (board[randomX][randomY] == null) {
                board[randomX][randomY] = unit
                println("Spawned unit at $randomX $randomY")
                return
            }
        }
    }

    fun removeUnit(unit: BattleUnit) {
        for (i in 0 until WIDTH) {
            for (j in 0 until HEIGHT) {
                if (board[i][j]?.id == unit.id) {
                    board[i][j] = null
                }
            }
        }
    }

    // TODO: Handle moves, attacks and healing
}