package client

import common.*
import java.io.ObjectInputStream
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

    // Loop for getting events from server to update the game state
    thread(start = true) {
        while (GameState.isRunning()) {
            val serverObject = ObjectInputStream(serverSocket.getInputStream()).readObject()

            println("I got from Server: $serverObject")
            // TODO: Update the game state based on received object
        }
    }

    // Loop for UI
    thread(start = true) {
        BattleFieldPanel {
            println("This code will execute when panel closes or application is quit")
        }
    }.join()
}
