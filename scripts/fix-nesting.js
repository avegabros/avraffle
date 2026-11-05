const fs = require('fs');
const path = require('path');

const mainDartPath = path.resolve(__dirname, '../mobile/lib/main.dart');
let code = fs.readFileSync(mainDartPath, 'utf8');

// Replace the misnested block
const incorrectBlock = `                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => PrizeManagementScreen(serverUrl: _serverUrl, location: _location),
                  ),
            const SizedBox(height: 32),
            Center(
              child: Text(
                'AV-Raffle ' + AppVersion.buildInfo,
                style: const TextStyle(fontSize: 12, color: Colors.white38, letterSpacing: 1.1),
              ),
            ),
                );
              },
            ),`;

const correctBlock = `                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => PrizeManagementScreen(serverUrl: _serverUrl, location: _location),
                  ),
                );
              },
            ),
            const SizedBox(height: 32),
            Center(
              child: Text(
                'AV-Raffle \${AppVersion.buildInfo}',
                style: const TextStyle(fontSize: 12, color: Colors.white38, letterSpacing: 1.1),
              ),
            ),`;

code = code.replace(incorrectBlock, correctBlock);
fs.writeFileSync(mainDartPath, code, 'utf8');
console.log('Fixed main.dart nesting syntax');
