const {spawn} = require('child_process');

const N = parseInt(process.argv[2] || 0, 10);

let remainingBots = N

for (let i = 0; i < N; i++) {
    const bot = spawn('npm', ['run-script', 'bot']);

    // bot.stdout.on('data', (data) => {
    //     console.log(`Bot ${i}: `, data.toString());
    // })

    bot.on('exit', () => {
        console.log(`Bot ${i}: exited`);
        remainingBots = remainingBots - 1
        console.log('Remaining bots: ' + remainingBots)
    });
}