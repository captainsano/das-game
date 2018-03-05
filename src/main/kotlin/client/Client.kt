package client

import common.*
import connection.*
import java.net.Socket
import java.net.SocketException
import java.io.ObjectOutputStream
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
    println("Starting the client")

    val request = Request(1, 2, Dragon(1, 10, 5, 3))

    // Connected and transfer the instruction
    val portNum = 9997
    try{
        val client = Socket("127.0.0.1", portNum)
        println("Connected to 127.0.0.1/$portNum")
        val output = ObjectOutputStream(client.getOutputStream())
        output.writeObject(request)
        client.close()
    }catch (se:SocketException){
        se.printStackTrace()
    }

    // Mock game state
    //GameState[10, 10] = Dragon(1, 10, 5, 3)
    //GameState[20, 14] = Knight(2, 20, 15, 5)

    thread(start = true) {
        BattleFieldPanel {
            println("This code will execute when panel closes or application is quit")
        }
    }.join()
}
