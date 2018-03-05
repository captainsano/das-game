package server

import common.GameState
import java.net.ServerSocket
import java.io.ObjectInputStream
import connection.Request
import java.io.ObjectOutputStream

fun main(args : Array<String>){

    Thread({
        val server = ServerSocket(9997)
        println("Server running on port ${server.localPort}")

        while (true) {
            // Receive instruction from client
            val client = server.accept()
            println("Client conected : ${client.inetAddress.hostAddress}")
            val inStream = ObjectInputStream(client.getInputStream())
            val instruction = inStream.readObject() as Request
            println("Object received = ${instruction.row}, ${instruction.col}, ${instruction.state}")
            GameState[instruction.row, instruction.col] = instruction.state

            // Send back response to client
            val os = ObjectOutputStream(client.getOutputStream())
            os.writeObject("GameState has been changed")
            client.close()

        }
        server.close()
    }).start()
}

