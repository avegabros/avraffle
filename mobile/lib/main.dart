import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:http/http.dart' as http;
import 'modes/registration_mode.dart';
import 'modes/emcee_mode.dart';
import 'modes/prize_management_mode.dart';
import 'modes/attendee_check_screen.dart';
import 'modes/public_prizes_screen.dart';
import 'version.dart';

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
  String _serverUrl = 'https://avraffle.abas.ph';
  String _location = 'TAYUD';
  bool _isLoggedIn = false;
  Map<String, dynamic>? _currentUser;
  bool _isAuthenticating = false;

  final _usernameController = TextEditingController();
  final _passwordController = TextEditingController();
  final _pinController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _loadSettings();
  }

  Future<void> _loadSettings() async {
    final prefs = await SharedPreferences.getInstance();
    setState(() {
      _serverUrl = prefs.getString('server_url') ?? 'https://avraffle.abas.ph';
      _location = prefs.getString('event_location') ?? 'TAYUD';
      final userJson = prefs.getString('saved_user');
      if (userJson != null) {
        try {
          _currentUser = jsonDecode(userJson);
          _isLoggedIn = true;
        } catch (_) {}
      }
    });
  }

  Future<void> _login(BuildContext modalContext) async {
    final username = _usernameController.text.trim();
    final password = _passwordController.text;

    if (username.isEmpty || password.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter username and password')),
      );
      return;
    }

    setState(() => _isAuthenticating = true);
    try {
      final res = await http.post(
        Uri.parse('$_serverUrl/api/auth/login'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'username': username, 'password': password}),
      );

      final data = jsonDecode(res.body);
      if (res.statusCode == 200 && data['success'] == true) {
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('saved_user', jsonEncode(data['user']));
        setState(() {
          _currentUser = data['user'];
          _isLoggedIn = true;
        });
        if (modalContext.mounted) Navigator.pop(modalContext);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Welcome, ${data['user']['name']}!')),
          );
        }
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(data['error'] ?? 'Invalid credentials')),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Unable to connect to server. Check settings.')),
        );
      }
    } finally {
      setState(() => _isAuthenticating = false);
    }
  }

  Future<void> _logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('saved_user');
    setState(() {
      _currentUser = null;
      _isLoggedIn = false;
      _usernameController.clear();
      _passwordController.clear();
    });
  }

  void _showLoginSheet() {
    _usernameController.clear();
    _passwordController.clear();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: const Color(0xFF1E293B),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModalState) => Padding(
          padding: EdgeInsets.only(
            left: 24,
            right: 24,
            top: 28,
            bottom: MediaQuery.of(ctx).viewInsets.bottom + 28,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Row(
                    children: [
                      Icon(Icons.shield_outlined, color: Color(0xFFF59E0B)),
                      SizedBox(width: 8),
                      Text(
                        'Event Staff Sign In',
                        style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white),
                      ),
                    ],
                  ),
                  IconButton(
                    icon: const Icon(Icons.close, color: Colors.grey),
                    onPressed: () => Navigator.pop(ctx),
                  ),
                ],
              ),
              const SizedBox(height: 6),
              const Text(
                'Sign in with your committee credentials to unlock Emcee Remote, Registration Desk, and Prizes Management.',
                style: TextStyle(fontSize: 12, color: Colors.grey),
              ),
              const SizedBox(height: 20),

              TextField(
                controller: _usernameController,
                decoration: InputDecoration(
                  labelText: 'Username',
                  prefixIcon: const Icon(Icons.person_outline, size: 20),
                  filled: true,
                  fillColor: const Color(0xFF0F172A),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: BorderSide.none),
                ),
              ),
              const SizedBox(height: 12),

              TextField(
                controller: _passwordController,
                obscureText: true,
                decoration: InputDecoration(
                  labelText: 'Password',
                  prefixIcon: const Icon(Icons.key, size: 20),
                  filled: true,
                  fillColor: const Color(0xFF0F172A),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: BorderSide.none),
                ),
              ),
              const SizedBox(height: 24),

              ElevatedButton.icon(
                icon: _isAuthenticating
                    ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.black))
                    : const Icon(Icons.login, color: Colors.black),
                label: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 14.0),
                  child: Text(
                    _isAuthenticating ? 'LOGGING IN...' : 'SIGN IN AS STAFF',
                    style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.black, fontSize: 15),
                  ),
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFFF59E0B),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                ),
                onPressed: _isAuthenticating ? null : () => _login(ctx),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showSettingsDialog() {
    final urlController = TextEditingController(text: _serverUrl);
    String tempLoc = _location;

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          backgroundColor: const Color(0xFF1E293B),
          title: const Text('System Configuration'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              TextField(
                controller: urlController,
                decoration: const InputDecoration(
                  labelText: 'Server Base URL (Domain or LAN IP)',
                  hintText: 'e.g. https://avraffle.abas.ph or http://192.168.3.4:3000',
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
                dropdownColor: const Color(0xFF1E293B),
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
        backgroundColor: const Color(0xFF1E293B),
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
          if (_isLoggedIn)
            IconButton(
              icon: const Icon(Icons.logout, color: Colors.redAccent),
              tooltip: 'Sign Out Staff',
              onPressed: _logout,
            ),
          IconButton(
            icon: const Icon(Icons.settings),
            tooltip: 'Server Connection',
            onPressed: _showSettingsDialog,
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 20.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Icon(Icons.casino, size: 70, color: Color(0xFFF59E0B)),
            const SizedBox(height: 12),
            const Text(
              'AV-RAFFLE COMPANION',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 22, fontWeight: FontWeight.w900, letterSpacing: 1.5),
            ),
            const SizedBox(height: 4),
            Text(
              'Server: $_serverUrl • Loc: $_location',
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 12, color: Colors.amber),
            ),
            const SizedBox(height: 28),

            // ==========================================
            // PUBLIC ATTENDEE HUB (Visible when logged OUT)
            // ==========================================
            if (!_isLoggedIn) ...[
              // Card 1: Check My Raffle Status
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFF1E293B), Color(0xFF0F172A)],
                  ),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: const Color(0xFFF59E0B).withValues(alpha: 0.3)),
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFFF59E0B).withValues(alpha: 0.08),
                      blurRadius: 20,
                      offset: const Offset(0, 8),
                    ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const Row(
                      children: [
                        Icon(Icons.search, color: Color(0xFFF59E0B), size: 24),
                        SizedBox(width: 10),
                        Text(
                          'Attendee Verification',
                          style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    const Text(
                      'Check if you are registered and active on the wheel. No password needed.',
                      style: TextStyle(fontSize: 12, color: Colors.grey),
                    ),
                    const SizedBox(height: 16),
                    ElevatedButton.icon(
                      icon: const Icon(Icons.verified, color: Colors.black),
                      label: const Padding(
                        padding: EdgeInsets.symmetric(vertical: 12.0),
                        child: Text('CHECK MY RAFFLE STATUS', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.black)),
                      ),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFFF59E0B),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                      ),
                      onPressed: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (_) => AttendeeCheckScreen(serverUrl: _serverUrl),
                          ),
                        );
                      },
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),

              // Card 2: View Raffle Prizes Showcase
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: const Color(0xFF1E293B),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: Colors.white12),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const Row(
                      children: [
                        Icon(Icons.card_giftcard, color: Color(0xFF10B981), size: 24),
                        SizedBox(width: 10),
                        Text(
                          'Raffle Prizes Catalog',
                          style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Text(
                      'Browse the grand prizes and regular items in play for $_location.',
                      style: const TextStyle(fontSize: 12, color: Colors.grey),
                    ),
                    const SizedBox(height: 16),
                    OutlinedButton.icon(
                      icon: const Icon(Icons.visibility, color: Color(0xFF10B981)),
                      label: const Padding(
                        padding: EdgeInsets.symmetric(vertical: 12.0),
                        child: Text('BROWSE RAFFLE PRIZES', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
                      ),
                      style: OutlinedButton.styleFrom(
                        side: const BorderSide(color: Color(0xFF10B981), width: 1.5),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                      ),
                      onPressed: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (_) => PublicPrizesScreen(serverUrl: _serverUrl, location: _location),
                          ),
                        );
                      },
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 32),

              // Staff Login Button (Cleans up the screen, avoids raw inputs)
              Center(
                child: TextButton.icon(
                  icon: const Icon(Icons.lock_outline, size: 18, color: Colors.white60),
                  label: const Text(
                    'Staff & Committee Sign In',
                    style: TextStyle(fontSize: 13, color: Colors.white70, fontWeight: FontWeight.bold),
                  ),
                  style: TextButton.styleFrom(
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                    backgroundColor: Colors.white.withValues(alpha: 0.05),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  onPressed: _showLoginSheet,
                ),
              ),
            ] else ...[
              // ==========================================
              // STAFF / OPERATOR ACCESS (Logged In)
              // ==========================================
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: const Color(0xFF10B981).withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: const Color(0xFF10B981).withValues(alpha: 0.3)),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.verified_user, color: Color(0xFF10B981)),
                        const SizedBox(width: 8),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              _currentUser?['name'] ?? 'Staff',
                              style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.white),
                            ),
                            Text(
                              'Role: ${_currentUser?['role'] ?? 'OPERATOR'}',
                              style: const TextStyle(fontSize: 10, color: Colors.grey),
                            ),
                          ],
                        ),
                      ],
                    ),
                    TextButton(
                      onPressed: _logout,
                      child: const Text('Log Out', style: TextStyle(color: Colors.redAccent, fontSize: 12)),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),

              // Mode 1: Registration Desk
              ElevatedButton.icon(
                icon: const Icon(Icons.person_add_alt_1, size: 26),
                label: const Padding(
                  padding: EdgeInsets.symmetric(vertical: 14.0),
                  child: Text('1. REGISTRATION DESK (MUGSHOT)', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
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
              const SizedBox(height: 16),

              // Mode 2: Emcee Spin Remote
              ElevatedButton.icon(
                icon: const Icon(Icons.play_circle_fill, size: 26),
                label: const Padding(
                  padding: EdgeInsets.symmetric(vertical: 14.0),
                  child: Text('2. EMCEE SPIN REMOTE (PIN LOCKED)', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF059669),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                ),
                onPressed: _unlockEmceeMode,
              ),
              const SizedBox(height: 16),

              // Mode 3: Prizes Team
              ElevatedButton.icon(
                icon: const Icon(Icons.card_giftcard, size: 26),
                label: const Padding(
                  padding: EdgeInsets.symmetric(vertical: 14.0),
                  child: Text('3. PRIZES INVENTORY & PHOTOS', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
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
              const SizedBox(height: 24),

              // Subtle secondary link for staff in case an attendee approaches them:
              Center(
                child: TextButton.icon(
                  icon: const Icon(Icons.search, size: 16, color: Colors.white54),
                  label: const Text(
                    'Quick Attendee Status Lookup',
                    style: TextStyle(fontSize: 12, color: Colors.white54),
                  ),
                  onPressed: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => AttendeeCheckScreen(serverUrl: _serverUrl),
                      ),
                    );
                  },
                ),
              ),
            ],

            const SizedBox(height: 36),
            Center(
              child: Text(
                'AV-Raffle ${AppVersion.buildInfo}',
                style: const TextStyle(fontSize: 12, color: Colors.white38, letterSpacing: 1.1),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
