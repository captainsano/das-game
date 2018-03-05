package server

import common.GameState
import java.net.ServerSocket
import java.util.*
import java.io.ObjectInputStream
import connection.Request



fun main(args : Array<String>){

    val th = Thread({

        val server = ServerSocket(9997)
        println("Server running on port ${server.localPort}")

        while (true) {

            val client = server.accept()
            println("Client conected : ${client.inetAddress.hostAddress}")

            val inStream = ObjectInputStream(client.getInputStream())

            val instruction = inStream.readObject() as Request
            println("Object received = ${instruction.row}, ${instruction.col}, ${instruction.state}")

            GameState[instruction.row, instruction.col] = instruction.state
            client.close()

        }
        server.close()
    }).start()

}



