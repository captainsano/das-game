package common

import java.io.Serializable
import kotlin.math.max
import kotlin.math.min

object GameState : Serializable {
    val WIDTH = 5
    val HEIGHT = 5

    private var running = true

    private val board = Array(WIDTH) {
        Array<BattleUnit?>(HEIGHT) { null }
    }

    enum class Direction{
        Up, Down, Left, Right
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

    /**
     * Remove the given unit if present on board
     */
    @Synchronized
    fun removeUnit(unit: BattleUnit) {
        for (i in 0 until WIDTH) {
            for (j in 0 until HEIGHT) {
                if (board[i][j]?.id == unit.id) {
                    removeUnit(Pair(i, j))
                }
            }
        }
    }

    /**
     * Remove unit at a certain location
     */
    @Synchronized
    fun removeUnit(location: Pair<Int, Int>) {
        board[location.first][location.second] = null
    }

    /**
     * Move unit from location to location. Returns true if the move was valid else false
     */
    @Synchronized
    fun moveUnit(from: Pair<Int, Int>, to: Pair<Int, Int>): Boolean {
        val unitAtFrom = board[from.first][from.second]
        if (unitAtFrom == null) {
            return false
        }

        val unitAtTo = board[to.first][to.second]
        if (unitAtTo != null) {
            return false
        }

        board[from.first][from.second] = null
        board[to.first][to.second] = unitAtFrom
        return true
    }

    /**
     * Damage a unit at a certain location
     */
    @Synchronized
    fun damageUnit(location: Pair<Int, Int>, damagePoints: Int): Boolean {
        val unitAtLocation = board[location.first][location.second]
        if (unitAtLocation == null) {
            return false
        }

        unitAtLocation.health = max(0, unitAtLocation.health - damagePoints)
        if (unitAtLocation.health == 0) {
            removeUnit(location)
        }

        return true
    }

    /**
     * Heal a unit at a certain location
     */
    @Synchronized
    fun healUnit(location: Pair<Int, Int>, healPoints: Int): Boolean {
        val unitAtLocation = board[location.first][location.second]
        if (unitAtLocation == null) {
            return false
        }

        unitAtLocation.health = min(unitAtLocation.maxHealth, unitAtLocation.health + healPoints)
        return true
    }
}