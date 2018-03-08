package server

import common.*
import connection.Request
import java.io.ObjectInputStream
import java.io.ObjectOutputStream
import java.net.ServerSocket
import java.net.Socket
import java.util.*

import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.ConcurrentLinkedQueue
import kotlin.concurrent.thread

fun main(args: Array<String>) {

    val server = ServerSocket(9997)
    println("Server running on port ${server.localPort}")

    val clients = ConcurrentHashMap<Socket, Int>()
    val eventQueue = ConcurrentLinkedQueue<Request>()

    // Thread to manage incoming client connections
    thread(start = true) {
        server.use {
            while (GameState.isRunning()) {
                // Accept a client connection
                val client = it.accept()
                val clientId = UnitIdGenerator.nextId()
                clients[client] = clientId

                println("Got a new client connection: $client ID: $clientId")

                thread(start = true) {
                    val unit = if (Random().nextBoolean()) {
                        Knight(clientId, 50, 50, 10)
                    } else {
                        Dragon(clientId, 50, 50, 10)
                    }

                    GameState.spawnUnit(unit)

                    // Send the id of the client
                    ObjectOutputStream(client.getOutputStream()).writeObject(UnitAssignmentMessage(clientId))

                    while (GameState.isRunning()) {
                        try {
                            ObjectInputStream(client.getInputStream()).readObject()
                            // TODO: Handle client messages
                        } catch (e: Exception) {
                            clients.remove(client)
                            GameState.removeUnit(unit)
                        }
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
            for ((client) in clients) {
                try {
                    ObjectOutputStream(client.getOutputStream()).writeObject(BoardUpdateMessage(GameState.getBoard()))
                } catch (e: Exception) {
                    // Do nothing (handled by the others)
                }
            }

            Thread.sleep(1000)
        }
    }
}
