const fs = require('fs');
const path = require('path');

const logPath = 'C:\\Users\\vbgrd\\.gemini\\antigravity-ide\\brain\\04cad0fc-97f3-4a89-a76b-eee59a3b4998\\.system_generated\\logs\\transcript.jsonl';
if (fs.existsSync(logPath)) {
    const lines = fs.readFileSync(logPath, 'utf-8').split('\n');
    lines.forEach((line, idx) => {
        if (!line.trim()) return;
        try {
            const obj = JSON.parse(line);
            const content = obj.content || '';
            const toolCalls = obj.tool_calls ? JSON.stringify(obj.tool_calls) : '';
            const txt = content + ' ' + toolCalls;
            if (txt.includes('私人影片') || txt.includes('私有') || (txt.includes('17') && txt.includes('影片'))) {
                console.log(`Line ${idx + 1} (Step ${obj.step_index}, Source ${obj.source}):`);
                // Print parts of txt that contain matches
                console.log(content.substring(0, 300));
                console.log("-----------------------------------------");
            }
        } catch (e) {
            // Ignore parse error
        }
    });
} else {
    console.log("Transcript log file not found!");
}
