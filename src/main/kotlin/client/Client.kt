package client

import common.*
import java.io.ObjectInputStream
import java.io.ObjectOutputStream
import java.net.Socket
import kotlin.concurrent.thread

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
        Thread.sleep(1000)
        val tmpBoard = GameState.getBoard()
        var fromRow = 0
        var fromCol = 0
        for (i in tmpBoard.indices) {
            for (j in tmpBoard[i].indices) {
                if (tmpBoard[i][j]?.id == id) {
                    fromRow = i
                    fromCol = j
                }
            }
        }
        println("$fromRow, $fromCol")
        ObjectOutputStream(serverSocket.getOutputStream()).writeObject(MoveUnitMessage(fromRow, fromCol, fromRow+1, fromCol))
    }

    // Loop for UI
    thread(start = true) {
        BattleFieldPanel {
            println("This code will execute when panel closes or application is quit")
            System.exit(0)
        }
    }.join()
}
