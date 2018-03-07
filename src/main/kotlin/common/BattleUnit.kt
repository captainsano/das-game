package common

import java.io.Serializable

sealed class BattleUnit(
        open val id: Int,
        open val maxHealth: Int,
        open var health: Int,
        open var hitPoints: Int
) : Serializable

data class Dragon(
        override val id: Int,
        override var maxHealth: Int,
        override var health: Int,
        override var hitPoints: Int
) : BattleUnit(id, maxHealth, health, hitPoints)

data class Knight(
        override val id: Int,
        override var maxHealth: Int,
        override var health: Int,
        override var hitPoints: Int
) : BattleUnit(id, maxHealth, health, hitPoints)
