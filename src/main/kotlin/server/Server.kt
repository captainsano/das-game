package server

import common.GameState
import connection.Request
import java.io.ObjectInputStream
import java.io.ObjectOutputStream
import java.net.ServerSocket
import java.net.Socket
import java.util.*
import java.util.concurrent.LinkedBlockingDeque
import kotlin.concurrent.thread

fun main(args: Array<String>) {

    val server = ServerSocket(9997)
    println("Server running on port ${server.localPort}")

    val clients = HashMap<Socket, Boolean>()
    val eventQueue = LinkedBlockingDeque<Request>()

    // Thread to manage incoming client connections
    thread(start = true) {
        server.use {
            while (GameState.isRunning()) {
                // Accept a client connection
                val client = it.accept()
                clients[client] = true

                println("Got a new client connection: $client")

                thread(start = true) {
                    while (GameState.isRunning()) {
                        val o = ObjectInputStream(client.getInputStream()).readObject()
                        println("Got object from client: $o")
                    }
                }

                // TODO: Handle client disconnection (Exception)
                // TODO: Remove player from game state map if disconnected
            }
        }
    }

    // Thread to periodically broadcast the game state to all the clients
    thread(start = true) {
        while (GameState.isRunning()) {
            for ((client, connected) in clients) {
                if (connected) {
                    ObjectOutputStream(client.getOutputStream()).writeObject(GameState)
                }

                // TODO: Handle exception (when client dies)
            }

            Thread.sleep(1000)
        }
    }.join()
}
