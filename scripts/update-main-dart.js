const fs = require('fs');
const path = require('path');

const mainDartPath = path.resolve(__dirname, '../mobile/lib/main.dart');
const lines = fs.readFileSync(mainDartPath, 'utf8').split(/\r?\n/);

const newLines = [];
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  newLines.push(line);
  if (line.includes('builder: (_) => PrizeManagementScreen')) {
    // Look ahead for the closing of this ElevatedButton: }, and ),
    while (i + 1 < lines.length && !lines[i + 1].trim().startsWith('),')) {
      i++;
      newLines.push(lines[i]);
    }
    if (i + 1 < lines.length && lines[i + 1].trim().startsWith('),')) {
      i++;
      newLines.push(lines[i]); // push the ),
      newLines.push('            const SizedBox(height: 32),');
      newLines.push('            Center(');
      newLines.push('              child: Text(');
      newLines.push("                'AV-Raffle ' + AppVersion.buildInfo,");
      newLines.push('                style: const TextStyle(fontSize: 12, color: Colors.white38, letterSpacing: 1.1),');
      newLines.push('              ),');
      newLines.push('            ),');
    }
  }
}

fs.writeFileSync(mainDartPath, newLines.join('\n'), 'utf8');
console.log('Successfully injected AppVersion via line parser');
