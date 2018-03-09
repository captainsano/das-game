package client

import common.*
import java.io.ObjectInputStream
import java.io.ObjectOutputStream
import java.net.Socket
import java.util.*
import kotlin.concurrent.thread
import kotlin.math.roundToInt

/**
 * Functions of the client
 *
 *  - Start the UI
 *  - Connect to the server
 *  - Display the game state
 *  - Disconnect and quit on close
 *  - (Optional) run bot to simulate moves and failures
 */


fun main(args: Array<String>) {
    val portNum = 9997
    val serverSocket = Socket("127.0.0.1", portNum)

    var id = -1

    // Loop for getting events from server to update the game state
    thread(start = true) {
        while (GameState.isRunning()) {
            val message = ObjectInputStream(serverSocket.getInputStream()).readObject()
            when (message) {
                is UnitAssignmentMessage -> id = message.id
                is BoardUpdateMessage -> GameState.update(message.board)
                else -> println("Unrecognizable message")
            }
        }
    }

    // The thread to send instruction to server
    thread(start = true) {
        loop@ while (GameState.isRunning()) {
            try {
                Thread.sleep(3 * 1000)
                // Get current client position (X,Y)
                val tmpBoard = GameState.getBoard()
                var fromX = 0
                var fromY = 0
                var AP = 0
                var targetX = -1
                var targetY = -1
                var instruction: Message
                var direction: GameState.Direction
                for (i in tmpBoard.indices) {
                    for (j in tmpBoard[i].indices) {
                        if (tmpBoard[i][j]?.id == id) {
                            fromX = i
                            fromY = j
                            AP = tmpBoard[i][j]!!.hitPoints
                        }
                    }
                }
                println("Current X: $fromX, Current Y: $fromY")
                val currentUnit = GameState.getBoard()[fromX][fromY]
                // Check the type of current Unit, Knight or Dragon
                if (currentUnit is Knight) {
                    // If current Unit is Knight, it can attack/move/heal.
                    // TODO: The max distance for healing is 5 and the max distance for attack is 2.
                    direction = GameState.Direction.values()[(GameState.Direction.values().size * Math.random()).roundToInt()]
                    when (direction) {
                        GameState.Direction.Up -> {
                            if (fromY <= 0)
                            // The player was at the edge of the map, so he can't move north and there are no units there
                                continue@loop
                            targetX = fromX
                            targetY = fromY - 1
                        }
                        GameState.Direction.Down -> {
                            if (fromY >= GameState.HEIGHT - 1)
                            // The player was at the edge of the map, so he can't move south and there are no units there
                                continue@loop
                            targetX = fromX
                            targetY = fromY + 1
                        }
                        GameState.Direction.Left -> {
                            if (fromX <= 0)
                            // The player was at the edge of the map, so he can't move west and there are no units there
                                continue@loop
                            targetX = fromX - 1
                            targetY = fromY
                        }
                        GameState.Direction.Right -> {
                            if (fromX >= GameState.WIDTH - 1)
                            // The player was at the edge of the map, so he can't move east and there are no units there
                                continue@loop
                            targetX = fromX + 1
                            targetY = fromY
                        }
                    }
                    val adjcentUnit = GameState.getBoard()[targetX][targetY]
                    when (adjcentUnit) {
                        is Dragon -> {
                            instruction = DamageUnitMessage(targetX, targetY, AP)
                        }
                        is Knight -> {
                            instruction = HealUnitMessage(targetX, targetY, AP)
                        }
                        else -> {
                            instruction = MoveUnitMessage(fromX, fromY, targetX, targetY)
                        }
                    }
                } else {
                    // If current unit is dragon, it can only attack nearby Knight (The max distance is 2).
                    val maxDistance = 2
                    val initList = mutableSetOf(Pair(fromX, fromY))
                    val targetUnit = GenerateCoordinate(initList, maxDistance)
                    var adjcentKnight = mutableListOf<Pair<Int, Int>>()
                    for (curUnit in targetUnit) {
                        if (GameState.getBoard()[curUnit.first][curUnit.second] is Knight)
                            adjcentKnight.add(curUnit)
                    }

                    if (adjcentKnight.size == 0)
                        continue@loop
                    val attackTarget = adjcentKnight.toList()[(adjcentKnight.size * Math.random()).roundToInt()]
                    instruction = DamageUnitMessage(attackTarget.first, attackTarget.second, AP)
                }
                ObjectOutputStream(serverSocket.getOutputStream()).writeObject(instruction)
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    // Loop for UI
    thread(start = true) {
        BattleFieldPanel {
            println("This code will execute when panel closes or application is quit")
            System.exit(0)
        }
    }.join()
}

fun GenerateCoordinate(fromUnit: Set<Pair<Int, Int>>, maxDistance: Int): MutableSet<Pair<Int, Int>> {
    var targetUnit: MutableSet<Pair<Int, Int>> = fromUnit.toMutableSet()
    when (maxDistance) {
        0 -> {
            return targetUnit
        }
        else -> {
            for (curUnit in fromUnit) {
                if (curUnit.first + 1 < 5)
                    targetUnit.add(Pair(curUnit.first + 1, curUnit.second))
                if (curUnit.first - 1 > 0)
                    targetUnit.add(Pair(curUnit.first - 1, curUnit.second))
                if (curUnit.second + 1 < 5)
                    targetUnit.add(Pair(curUnit.first, curUnit.second + 1))
                if (curUnit.second - 1 > 0)
                    targetUnit.add(Pair(curUnit.first, curUnit.second - 1))
            }
            return GenerateCoordinate(targetUnit, maxDistance - 1)
        }
    }
}
