package client

import common.BattleField
import common.Dragon
import common.GameState
import common.Knight
import kotlin.concurrent.thread
import kotlin.coroutines.experimental.*

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
    println("Starting the client")

    // Mock game state
    GameState[10, 10] = Dragon(1, 10, 5, 3)
    GameState[20, 14] = Knight(2, 20, 15, 5)

    thread(start = true) {
        BattleFieldPanel {
            println("This code will execute when panel closes or application is quit")
        }
    }.join()
}