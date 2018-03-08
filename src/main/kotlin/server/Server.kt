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
    val eventQueue = ConcurrentLinkedQueue<Message>()

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
                            val message = ObjectInputStream(client.getInputStream()).readObject()
                            // TODO: Handle client messages
                            when(message){
                                is Message -> eventQueue.add(message)
                                else -> println("Unrecognizable message")
                            }
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

    // Thread to retrieve message from eventQueue and carry out the instruction
    thread(start = true){
        while(GameState.isRunning()){
            while(!eventQueue.isEmpty()){
                val message = eventQueue.poll()
                when(message){
                    is MoveUnitMessage -> {
                        if(!GameState.moveUnit(Pair(message.fromRow, message.fromCol), Pair(message.toRow, message.toCol)))
                            println("The movement cannot be carried out!")
                    }
                    is DamageUnitMessage -> {
                        if(!GameState.damageUnit(Pair(message.toRow, message.toCol), message.damagePoint))
                            println("The target unit does not exist!")
                    }
                    is HealUnitMessage -> {
                        if(!GameState.healUnit(Pair(message.toRow, message.toCol), message.healPoint))
                            println("The target unit does not exist!")
                    }
                    else -> println("Unrecognisable message!")
                }
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
