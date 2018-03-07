package client

import common.*
import java.awt.*
import java.awt.event.WindowEvent
import java.awt.event.WindowListener
import javax.swing.JPanel

class BattleFieldPanel(
        val onCloseBlock: () -> Unit
) : JPanel() {
    init {
        setupFrame()

        while (GameState.isRunning()) {
            Thread.sleep(1000)

            this.repaint()
        }
    }

    private fun setupFrame() {
        val frame = Frame()
        frame.addWindowListener(object : WindowListener {
            override fun windowDeiconified(e: WindowEvent?) {}

            override fun windowClosed(e: WindowEvent?) {}

            override fun windowActivated(e: WindowEvent?) {}

            override fun windowDeactivated(e: WindowEvent?) {}

            override fun windowOpened(e: WindowEvent?) {}

            override fun windowIconified(e: WindowEvent?) {}

            override fun windowClosing(e: WindowEvent?) {
                frame.isVisible = false
                frame.dispose()
                onCloseBlock()
            }
        })
        frame.add(this)
        frame.minimumSize = Dimension(200, 200)
        frame.size = Dimension(500, 500)
        frame.isVisible = true
    }

    override fun paint(graphics: Graphics?) {
        if (graphics != null) {
            val bufferImage = createImage(width, height)
            val bufferGraphics = bufferImage.graphics

            val squareWidth = width / GameState.WIDTH
            val squareHeight = height / GameState.HEIGHT

            bufferGraphics.clearRect(0, 0, width, height)
            bufferGraphics.color = Color.BLACK

            for (x in 0 until GameState.WIDTH) {
                for (y in 0 until GameState.HEIGHT) {
                    bufferGraphics.drawRect(x * squareWidth, y * squareHeight, squareWidth, squareHeight)

                    val unit = GameState[x, y]

                    if (unit is Dragon) {
                        bufferGraphics.color = Color.RED
                    } else if (unit is Knight) {
                        bufferGraphics.color = Color.BLUE
                    }

                    if (unit != null) {
                        // Unit
                        bufferGraphics.fillRect((x * squareWidth) + 1, (y * squareHeight) + 1, squareWidth - 1, squareHeight - 1);

                        // TODO: draw health bar

                        // Identifier
                        bufferGraphics.setColor(Color.WHITE)
                        bufferGraphics.drawString("${unit.id}", (x * squareWidth) + 5, (y * squareHeight) + 15)
                        bufferGraphics.setColor(Color.BLACK)
                    }

                    bufferGraphics.color = Color.BLACK
                }
            }

            graphics.drawImage(bufferImage, 0, 0, this)
        }
    }
}