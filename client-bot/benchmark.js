const fs = require('fs')
const readline = require('readline')
const path = require('path')
const R = require('ramda')

const {spawn} = require('child_process');

const N = parseInt(process.argv[2] || 0, 10);

for (let i = 0; i < N; i++) {
    setTimeout(() => {
		console.log(`Spawing ${i + 1}`)
        spawn('npm', ['run-script', 'bot']);
    }, i * 2000);
}
