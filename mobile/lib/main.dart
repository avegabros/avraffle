import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'modes/registration_mode.dart';
import 'modes/emcee_mode.dart';
import 'modes/prize_management_mode.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const AVRaffleApp());
}

class AVRaffleApp extends StatelessWidget {
  const AVRaffleApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'AV-Raffle Remote',
      debugShowCheckedModeBanner: false,
      theme: ThemeData.dark().copyWith(
        scaffoldBackgroundColor: const Color(0xFF0F172A),
        colorScheme: const ColorScheme.dark(
          primary: Color(0xFFF59E0B),
          secondary: Color(0xFF10B981),
        ),
      ),
      home: const MainGateScreen(),
    );
  }
}

class MainGateScreen extends StatefulWidget {
  const MainGateScreen({super.key});

  @override
  State<MainGateScreen> createState() => _MainGateScreenState();
}

class _MainGateScreenState extends State<MainGateScreen> {
  String _serverUrl = 'http://192.168.3.4:3000';
  String _location = 'TAYUD';
  final _pinController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _loadSettings();
  }

  Future<void> _loadSettings() async {
    final prefs = await SharedPreferences.getInstance();
    setState(() {
      _serverUrl = prefs.getString('server_url') ?? 'http://192.168.3.4:3000';
      _location = prefs.getString('event_location') ?? 'TAYUD';
    });
  }

  void _showSettingsDialog() {
    final urlController = TextEditingController(text: _serverUrl);
    String tempLoc = _location;

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          title: const Text('System Configuration'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              TextField(
                controller: urlController,
                decoration: const InputDecoration(
                  labelText: 'Server Base URL (LAN or Cloud)',
                  hintText: 'e.g. http://192.168.3.4:3000',
                ),
              ),
              const SizedBox(height: 16),
              const Text(
                'Event Location',
                style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.grey),
              ),
              const SizedBox(height: 8),
              DropdownButton<String>(
                value: tempLoc,
                isExpanded: true,
                items: const [
                  DropdownMenuItem(value: 'TAYUD', child: Text('Tayud Land-Based')),
                  DropdownMenuItem(value: 'MAKATI', child: Text('Makati Land-Based')),
                  DropdownMenuItem(value: 'ALL', child: Text('All Locations')),
                ],
                onChanged: (val) {
                  if (val != null) {
                    setDialogState(() => tempLoc = val);
                  }
                },
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: () async {
                final prefs = await SharedPreferences.getInstance();
                final newUrl = urlController.text.trim();
                await prefs.setString('server_url', newUrl);
                await prefs.setString('event_location', tempLoc);
                setState(() {
                  _serverUrl = newUrl;
                  _location = tempLoc;
                });
                if (ctx.mounted) Navigator.pop(ctx);
              },
              child: const Text('Save'),
            ),
          ],
        ),
      ),
    );
  }

  void _unlockEmceeMode() {
    _pinController.clear();
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Emcee Mode (Host Only)'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text(
              'Enter coordinator PIN to enter Emcee Spin Remote:',
              style: TextStyle(fontSize: 13, color: Colors.grey),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _pinController,
              keyboardType: TextInputType.number,
              obscureText: true,
              maxLength: 4,
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 24, letterSpacing: 8, fontWeight: FontWeight.bold),
              decoration: const InputDecoration(
                hintText: 'PIN',
                border: OutlineInputBorder(),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              if (_pinController.text == '8888' || _pinController.text == '1234') {
                Navigator.pop(ctx);
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => EmceeRemoteScreen(serverUrl: _serverUrl, location: _location),
                  ),
                );
              } else {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Invalid PIN')),
                );
              }
            },
            child: const Text('Unlock'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('AV-Raffle System', style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: Colors.transparent,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.settings),
            onPressed: _showSettingsDialog,
          ),
        ],
      ),
      body: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.casino, size: 80, color: Color(0xFFF59E0B)),
            const SizedBox(height: 16),
            const Text(
              'AV-RAFFLE CONTROLLER',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 22, fontWeight: FontWeight.w900, letterSpacing: 1.5),
            ),
            Text(
              'Server: $_serverUrl • Loc: $_location',
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 12, color: Colors.amber),
            ),
            const SizedBox(height: 48),

            // Mode 1: Registration Desk
            ElevatedButton.icon(
              icon: const Icon(Icons.person_add_alt_1, size: 28),
              label: const Padding(
                padding: EdgeInsets.symmetric(vertical: 16.0),
                child: Text('1. REGISTRATION DESK', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF2563EB),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              ),
              onPressed: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => RegistrationScreen(serverUrl: _serverUrl, location: _location),
                  ),
                );
              },
            ),
            const SizedBox(height: 20),

            // Mode 2: Emcee Spin Remote
            ElevatedButton.icon(
              icon: const Icon(Icons.play_circle_fill, size: 28),
              label: const Padding(
                padding: EdgeInsets.symmetric(vertical: 16.0),
                child: Text('2. EMCEE SPIN REMOTE (LOCKED)', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF059669),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              ),
              onPressed: _unlockEmceeMode,
            ),
            const SizedBox(height: 20),

            // Mode 3: Prizes Team
            ElevatedButton.icon(
              icon: const Icon(Icons.card_giftcard, size: 28),
              label: const Padding(
                padding: EdgeInsets.symmetric(vertical: 16.0),
                child: Text('3. PRIZES INVENTORY & PHOTOS', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFD97706),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              ),
              onPressed: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => PrizeManagementScreen(serverUrl: _serverUrl, location: _location),
                  ),
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}
