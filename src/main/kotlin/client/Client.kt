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
                var instruction: Message
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
                    // If current Unit is Knight, it can attack/move/heal, decide type of movement first and
                    val randomAction = (0..2).random()
                    when (randomAction) {
                        // Move
                        0 -> {
                            val initList = mutableSetOf(Pair(fromX, fromY))
                            val targetUnit = GenerateCoordinate(initList, 1)
                            val direction = targetUnit.toList()[(targetUnit.size * Math.random()).roundToInt()]
                            instruction = MoveUnitMessage(fromX, fromY, direction.first, direction.second)
                        }
                        // Attack
                        1 -> {
                            val initList = mutableSetOf(Pair(fromX, fromY))
                            val targetUnit = GenerateCoordinate(initList, 2)
                            var adjcentDragon = mutableListOf<Pair<Int, Int>>()
                            for (curUnit in targetUnit) {
                                if (GameState.getBoard()[curUnit.first][curUnit.second] is Knight)
                                    adjcentDragon.add(curUnit)
                            }

                            if (adjcentDragon.size == 0)
                                continue@loop
                            val attackTarget = adjcentDragon.toList()[(adjcentDragon.size * Math.random()).roundToInt()]
                            instruction = DamageUnitMessage(attackTarget.first, attackTarget.second, AP)
                        }
                        // Heal
                        else -> {
                            val initList = mutableSetOf(Pair(fromX, fromY))
                            val targetUnit = GenerateCoordinate(initList, 5)
                            var adjcentKnight = mutableListOf<Pair<Int, Int>>()
                            for (curUnit in targetUnit) {
                                if (GameState.getBoard()[curUnit.first][curUnit.second] is Knight)
                                    adjcentKnight.add(curUnit)
                            }

                            if (adjcentKnight.size == 0)
                                continue@loop
                            val healTarget = adjcentKnight.toList()[(adjcentKnight.size * Math.random()).roundToInt()]
                            instruction = DamageUnitMessage(healTarget.first, healTarget.second, AP)
                        }
                    }
                    ObjectOutputStream(serverSocket.getOutputStream()).writeObject(instruction)
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

fun ClosedRange<Int>.random() =
        Random().nextInt(endInclusive - start) + start