package server

object UnitIdGenerator {
    private var lastUnitId = 0

    @Synchronized
    fun nextId(): Int {
        lastUnitId += 1
        return lastUnitId
    }
}