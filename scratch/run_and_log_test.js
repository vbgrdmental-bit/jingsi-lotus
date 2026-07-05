const fs = require('fs');
const path = require('path');
const execSync = require('child_process').execSync;

try {
    const output = execSync('node scratch/verify_edit_no_loss.js', { encoding: 'utf-8' });
    fs.writeFileSync(path.join(__dirname, 'test_output.txt'), output, 'utf-8');
    console.log("Wrote test output to test_output.txt");
} catch (err) {
    const out = err.stdout || err.message;
    fs.writeFileSync(path.join(__dirname, 'test_output.txt'), out, 'utf-8');
    console.log("Wrote error output to test_output.txt");
}
