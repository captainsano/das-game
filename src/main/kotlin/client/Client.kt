package client

import common.*
import server.ServerInterface
import java.rmi.Naming
import java.rmi.registry.LocateRegistry
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
class Client : ClientInterface {
    fun main(args: Array<String>) {
        println("Starting the client")

        // Initiate the remote connection.
        initiator()

        val ins:MutableList<Instruction> = mutableListOf(
                Instruction(10, 10, Dragon(1, 10, 5, 3)),
                Instruction(20, 10, Knight(2, 20, 15, 5)))

        // Mock game state
        //GameState[10, 10] = Dragon(1, 10, 5, 3)
        //GameState[20, 14] = Knight(2, 20, 15, 5)

        // Send Instruction to server.
        sendInstruction(ins)

        thread(start = true) {
            BattleFieldPanel {
                println("This code will execute when panel closes or application is quit")
            }
        }.join()
    }

    private fun initiator() {
        var registry = LocateRegistry.getRegistry()
        var c = Client()
        try {
            registry.rebind("Client", c)
        } catch (e: Exception) {
            println("Client Error" + e.message)
            e.printStackTrace()
        }
    }

    private fun sendInstruction(instruction: MutableList<Instruction>) {
        val ipAddress = "127.0.0.1"
        val address = "//$ipAddress:1099/Client"
        println(address)
        try {
            val server = Naming.lookup(address) as ServerInterface
            server.receiveInstruction(instruction)
        } catch (e: Exception) {
            println("could not get process with address $address")
        }
    }

    override fun updateGameState(g: GameState) {
        // Update GameState
    }
}
