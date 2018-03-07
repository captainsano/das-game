package connection

import common.BattleUnit
import java.io.Serializable

class Request(val row: Int,
              val col: Int,
              val state: BattleUnit) : Serializable