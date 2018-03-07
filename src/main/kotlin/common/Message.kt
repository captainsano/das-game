package common

import java.io.Serializable

sealed class Message : Serializable

/**
 * Message from server to client for assignment of unit id
 */
data class UnitAssignmentMessage(val id: Int) : Message()

/**
 * Message from server to client for game state update
 */
data class GameStateUpdateMessage(val gameState: GameState) : Message()