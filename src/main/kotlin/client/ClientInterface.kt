package client

import common.GameState
import java.rmi.Remote

interface ClientInterface : Remote{
    fun updateGameState(g: GameState) {}
}