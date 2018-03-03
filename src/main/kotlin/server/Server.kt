package server

import client.ClientInterface
import common.Instruction
import common.GameState
import kotlin.concurrent.thread
import java.rmi.Naming
import java.rmi.registry.LocateRegistry

class Server: ServerInterface{

    fun main(args: Array<String>){
        initiator()
    }

    fun initiator(){
        var registry = LocateRegistry.getRegistry()
        var s = Server()
        try {
            registry.rebind("Server", s)
        }catch (e:Exception){
            println("Server Error" + e.message)
            e.printStackTrace()
        }
    }

    override fun receiveInstruction(ins: MutableList<Instruction>){
        val ipAddress = "127.0.0.1"
        val address = "//$ipAddress:1099/Client"
        try {
            val client = Naming.lookup(address) as ClientInterface
            val iterator = ins.iterator()
            while(iterator.hasNext()){
                val tmp = iterator.next()
                GameState[tmp.row, tmp.col] = tmp.status
            }
            client.updateGameState(GameState)
        } catch (e: Exception) {
            println("could not get process with address $address")
        }
    }
}
