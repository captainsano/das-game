const {spawn} = require('child_process');

const N = parseInt(process.argv[2] || 0, 10);

for (let i = 0; i < N; i++) {
    const bot = spawn('npm', ['run-script', 'bot']);

    bot.on('exit', () => {
        console.log('---> Bot exited');
    });
}