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
data class BoardUpdateMessage(val board: Array<Array<BattleUnit?>>) : Message()

/**
 * Message from client to server for move unit
 */

data class MoveUnitMessage(val fromRow: Int, val fromCol: Int, val toRow: Int, val toCol: Int) : Message()

/**
 * Message from client to server for attack
 */

data class DamageUnitMessage(val fromRow: Int, val fromCol: Int, val toRow: Int, val toCol: Int, val damagePoint: Int) : Message()

/**
 * Message from client to server for heal
 */

data class HealUnitMessage(val fromRow: Int, val fromCol: Int, val toRow: Int, val toCol: Int, val healPoint: Int) : Message()