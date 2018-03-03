package common

data class Instruction(
        val row: Int,
        var col: Int,
        var status: BattleUnit
)