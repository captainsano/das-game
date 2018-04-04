const fs = require('fs')
const readline = require('readline')
const path = require('path')
const R = require('ramda')

const {spawn} = require('child_process');

const N = parseInt(process.argv[2] || 0, 10);

for (let i = 0; i < N; i++) {
    setTimeout(() => {
        const bot = spawn('npm', ['run-script', 'bot']);

        bot.stdout.on('data', (data) => {
            const str = data.toString().trim();
            if (!str.startsWith('<')) {
                console.log(data.toString().trim());
            }
        })
    
        bot.on('exit', () => {
            // console.log(`Bot ${i}: exited`);
        });
    }, i * 2500)
}
