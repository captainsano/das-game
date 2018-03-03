package server

import common.Instruction
import java.rmi.Remote

interface ServerInterface : Remote{
    fun receiveInstruction(ins: MutableList<Instruction>) {}
}