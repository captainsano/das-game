const fs = require('fs')
const readline = require('readline')
const path = require('path')
const R = require('ramda')

const {spawn} = require('child_process');

var rd = readline.createInterface({
    input: fs.createReadStream(path.join(process.cwd(), 'WoT_Edge_Detailed')),
});

let START_TS = 0
const schedule = []
let skippedFirstLine = false

rd.on('line', (line) => {
    if (line.startsWith('#')) return;

    const components = line.split(',')
    if (skippedFirstLine) {
        const timestamp = parseInt(components[1].trim(), 10)
        const lifetime = parseInt(components[2].trim(), 10)
        schedule.push({timestamp: timestamp, lifetime: lifetime})
    } else {
        skippedFirstLine = true
    }
});

rd.on('close', () => {
    console.log(`${schedule.length} events in schedule`)

    // Scale the schedule to suitable bot intervals
    const sortedSchedule = R.filter(({lifetime}) => lifetime > 0, R.sortBy(R.prop('timestamp'), R.map((x) => ({ ...x, lifetime: x.lifetime * 5 * 10 }), schedule)))
    const FIRST_TS = sortedSchedule[0].timestamp
    const finalSchedule = R.map((x) => ({...x, timestamp: (x.timestamp - FIRST_TS) / 10}), sortedSchedule)

    finalSchedule.forEach(({timestamp, lifetime}, i) => {
        setTimeout(() => {
            const bot = spawn('npm', ['run-script', 'bot']);
            console.log('Started Bot: ', timestamp, lifetime)

            bot.on('exit', () => {
                console.log(`Bot ${i} exited`);
            });

            setTimeout(() => {
                console.log('--> Killing bot ', i)
                bot.kill()
            }, lifetime)
        }, timestamp)
    })
})


// const N = parseInt(process.argv[2] || 0, 10);

// for (let i = 0; i < N; i++) {
//     const bot = spawn('npm', ['run-script', 'bot']);

//     bot.stdout.on('data', (data) => {
//         console.log(`Bot ${i}: `, data.toString());
//     })

//     bot.on('exit', () => {
//         console.log(`Bot ${i}: exited`);
//     });
// }