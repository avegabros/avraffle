import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:vibration/vibration.dart';
import 'package:http/http.dart' as http;
import 'package:wakelock_plus/wakelock_plus.dart';

class EmceeRemoteScreen extends StatefulWidget {
  final String serverUrl;
  final String location;
  const EmceeRemoteScreen({super.key, required this.serverUrl, this.location = 'ALL'});

  @override
  State<EmceeRemoteScreen> createState() => _EmceeRemoteScreenState();
}

class _EmceeRemoteScreenState extends State<EmceeRemoteScreen> {
  bool _isConnected = false;
  bool _isSpinning = false;
  bool _keepScreenAwake = true;
  String _currentPrize = 'Loading Prize...';
  String? _currentPrizeImage;
  bool _isGrand = false;
  int? _grandPrizeId;
  List<dynamic> _grandPrizes = [];
  List<dynamic> _regularPrizes = [];
  Timer? _pollTimer;
  Map<String, dynamic>? _lastWinner;
  bool _allPrizesClaimed = false;
  bool _isButtonPressed = false;
  late String _activeLocation;

  // Spin Settings
  int _duration = 8;
  String _power = 'high';

  @override
  void initState() {
    super.initState();
    _activeLocation = widget.location;
    _enableWakelock(true);
    _fetchGrandPrizes();
    _fetchSettings();
    _startPolling();
  }

  void _enableWakelock(bool enable) {
    setState(() => _keepScreenAwake = enable);
    if (enable) {
      WakelockPlus.enable();
    } else {
      WakelockPlus.disable();
    }
  }

  void _startPolling() {
    _pollTimer?.cancel();
    _pollTimer = Timer.periodic(const Duration(milliseconds: 500), (_) async {
      try {
        final res = await http.get(Uri.parse('${widget.serverUrl}/api/wheel/state')).timeout(const Duration(seconds: 2));
        if (res.statusCode == 200) {
          final data = jsonDecode(res.body);
          final state = data['state'];
          if (mounted) {
            setState(() {
              _isConnected = true;
              final serverStatus = state['status'];
              if (serverStatus == 'SPINNING') {
                _isSpinning = true;
              } else if (serverStatus == 'IDLE') {
                if (_isSpinning) {
                  _isSpinning = false;
                }
                // Sync winner from server: if server cleared winner (e.g. claimed or dismissed on stage), dismiss in app
                if (state['winner'] != null) {
                  if (_lastWinner == null || _lastWinner!['id'] != state['winner']['id']) {
                    _lastWinner = state['winner'];
                    Vibration.vibrate(duration: 400);
                  }
                } else {
                  // If stage or another client confirmed/claimed or marked absent, clear _lastWinner so app doesn't show stale claim/absent buttons
                  if (_lastWinner != null) {
                    _lastWinner = null;
                  }
                }
              }

              // Sync current prize from server if updated or auto-advanced
              if (state['allPrizesClaimed'] != null) {
                _allPrizesClaimed = state['allPrizesClaimed'] == true;
              } else if (state['prizeName'] == 'All Prizes Claimed!') {
                _allPrizesClaimed = true;
              }

              if (state['prizeName'] != null && !_isSpinning) {
                if (_currentPrize != state['prizeName']) {
                  _currentPrize = state['prizeName'];
                  _currentPrizeImage = state['prizeImagePath'];
                  _isGrand = state['isGrand'] ?? false;
                  _grandPrizeId = state['grandPrizeId'];
                }
              }

              // Sync active location from state or settings payload
              final settingsPayload = data['settings'];
              final String? loc = (state['location'] ?? settingsPayload?['activeLocation'])?.toString();
              if (loc != null && loc.isNotEmpty && loc != _activeLocation) {
                _activeLocation = loc;
                _fetchGrandPrizes();
              }
            });
          }
        }
      } catch (_) {
        if (mounted) setState(() => _isConnected = false);
      }
    });
  }

  Future<void> _fetchGrandPrizes() async {
    try {
      final locParam = _activeLocation != 'ALL' ? '?location=$_activeLocation' : '';
      final res = await http.get(Uri.parse('${widget.serverUrl}/api/wheel$locParam'));
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        setState(() {
          _grandPrizes = data['grandPrizes'] ?? [];
          _regularPrizes = data['regularPrizes'] ?? [];
          if (data['allPrizesClaimed'] != null) {
            _allPrizesClaimed = data['allPrizesClaimed'] == true;
          } else {
            _allPrizesClaimed = _grandPrizes.isEmpty && _regularPrizes.isEmpty;
          }
          // Pick first regular prize or grand prize from DB
          if (_currentPrize == 'Loading Prize...' || _currentPrize == '1 Sack 5 kl Rice' || _currentPrize == 'General Raffle Prize') {
            if (_regularPrizes.isNotEmpty) {
              _currentPrize = _regularPrizes.first['name'];
              _currentPrizeImage = _regularPrizes.first['imagePath'];
              _isGrand = false;
              _grandPrizeId = _regularPrizes.first['id'];
            } else if (_grandPrizes.isNotEmpty) {
              _currentPrize = _grandPrizes.first['name'];
              _currentPrizeImage = _grandPrizes.first['imagePath'];
              _isGrand = true;
              _grandPrizeId = _grandPrizes.first['id'];
            }
          }
        });
      }
    } catch (_) {}
  }

  Future<void> _fetchSettings() async {
    try {
      final res = await http.get(Uri.parse('${widget.serverUrl}/api/settings'));
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        final serverLoc = data['activeLocation']?.toString();
        setState(() {
          _duration = data['duration'] ?? 8;
          _power = data['power'] ?? 'high';
          if (serverLoc != null && serverLoc.isNotEmpty && serverLoc != _activeLocation) {
            _activeLocation = serverLoc;
            _fetchGrandPrizes();
          }
        });
      }
    } catch (_) {}
  }

  Future<void> _updateSpinSetting(int newDuration, String newPower) async {
    setState(() {
      _duration = newDuration;
      _power = newPower;
    });

    try {
      await http.post(
        Uri.parse('${widget.serverUrl}/api/settings'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'duration': newDuration,
          'power': newPower,
        }),
      );
    } catch (_) {}
  }

  Future<void> _triggerSpin() async {
    if (_isSpinning || _allPrizesClaimed) return;
    Vibration.vibrate(duration: 80);

    setState(() {
      _isSpinning = true;
      _lastWinner = null;
    });

    try {
      final res = await http.post(
        Uri.parse('${widget.serverUrl}/api/wheel/state'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'action': 'SPIN',
          'prizeName': _currentPrize,
          'prizeImagePath': _currentPrizeImage,
          'isGrand': _isGrand,
          'grandPrizeId': _grandPrizeId,
          'location': _activeLocation,
        }),
      ).timeout(const Duration(seconds: 4));

      if (res.statusCode == 200) {
        if (mounted) {
          setState(() {
            _isSpinning = true;
          });
        }
      } else if (res.statusCode == 409) {
        // Another APK or remote already triggered the spin!
        if (mounted) {
          setState(() => _isSpinning = true);
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('⚠️ Wheel is already in motion! Synchronizing...'),
              backgroundColor: Colors.amber,
              duration: Duration(seconds: 2),
            ),
          );
        }
      } else {
        if (mounted) {
          setState(() => _isSpinning = false);
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isSpinning = false);
      }
    }
  }

  Future<void> _confirmWinner() async {
    if (_lastWinner == null) return;
    Vibration.vibrate(duration: 100);

    final winnerId = _lastWinner!['id'];
    final winnerName = _lastWinner!['name'];

    setState(() {
      _lastWinner = null;
    });

    try {
      // 1. Confirm winner in database
      await http.post(
        Uri.parse('${widget.serverUrl}/api/wheel/confirm'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'guestId': winnerId,
          'prizeName': _currentPrize,
          'grandPrizeId': _grandPrizeId,
        }),
      );

      // 2. Notify stage to dismiss dialog and update state
      await http.post(
        Uri.parse('${widget.serverUrl}/api/wheel/state'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'action': 'CONFIRM_CLAIMED'}),
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('🏆 Confirmed & Claimed by $winnerName!'),
            backgroundColor: Colors.green.shade700,
          ),
        );
      }
    } catch (_) {}
  }

  Future<void> _requestRespin() async {
    Vibration.vibrate(duration: 50);
    setState(() {
      _isSpinning = false;
      _lastWinner = null;
    });

    try {
      await http.post(
        Uri.parse('${widget.serverUrl}/api/wheel/state'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'action': 'RESPIN'}),
      );
    } catch (_) {}
  }

  Future<void> _closeWinnerModal() async {
    setState(() => _lastWinner = null);
    try {
      await http.post(
        Uri.parse('${widget.serverUrl}/api/wheel/state'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'action': 'CLOSE_MODAL'}),
      );
    } catch (_) {}
  }

  void _showSpinSettingsDialog() {
    int tempDuration = _duration;
    String tempPower = _power;

    showModalBottomSheet(
      context: context,
      backgroundColor: const Color(0xFF1E293B),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModalState) => Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text('Live Spin Controls', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              const SizedBox(height: 16),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Duration:', style: TextStyle(fontWeight: FontWeight.bold)),
                  Text('$tempDuration sec(s)', style: const TextStyle(color: Color(0xFFF59E0B), fontWeight: FontWeight.bold)),
                ],
              ),
              Slider(
                min: 3,
                max: 20,
                divisions: 17,
                value: tempDuration.toDouble(),
                activeColor: const Color(0xFFF59E0B),
                onChanged: (v) {
                  setModalState(() => tempDuration = v.toInt());
                  _updateSpinSetting(v.toInt(), tempPower);
                },
              ),
              const SizedBox(height: 12),
              const Text('Power / Speed:', style: TextStyle(fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              Row(
                children: ['low', 'medium', 'high'].map((p) {
                  final isSel = tempPower == p;
                  return Expanded(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 4.0),
                      child: ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: isSel ? const Color(0xFFF59E0B) : Colors.grey.shade800,
                          foregroundColor: isSel ? Colors.black : Colors.white,
                        ),
                        onPressed: () {
                          setModalState(() => tempPower = p);
                          _updateSpinSetting(tempDuration, p);
                        },
                        child: Text(p.toUpperCase(), style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                      ),
                    ),
                  );
                }).toList(),
              ),
              const SizedBox(height: 16),
            ],
          ),
        ),
      ),
    );
  }

  void _selectPrizeDialog() {
    _fetchGrandPrizes(); // Refresh latest prize counts & list from server
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF1E293B),
        title: const Row(
          children: [
            Icon(Icons.military_tech, color: Color(0xFFF59E0B)),
            SizedBox(width: 8),
            Text('Select Draw Prize', style: TextStyle(fontSize: 18, color: Colors.white, fontWeight: FontWeight.bold)),
          ],
        ),
        content: SizedBox(
          width: double.maxFinite,
          child: ListView(
            shrinkWrap: true,
            children: [
              // Option: Auto Queue by Priority
              ListTile(
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                tileColor: const Color(0xFF0F172A),
                leading: const Icon(Icons.auto_mode, color: Colors.cyanAccent),
                title: const Text('⚡ Auto-Queue by Priority', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                subtitle: const Text('Follows priority order configured in Admin', style: TextStyle(fontSize: 11, color: Colors.grey)),
                onTap: () async {
                  Navigator.pop(ctx);
                  try {
                    final res = await http.post(
                      Uri.parse('${widget.serverUrl}/api/wheel/state'),
                      headers: {'Content-Type': 'application/json'},
                      body: jsonEncode({
                        'action': 'RESET_TO_AUTO_QUEUE',
                        'location': _activeLocation,
                      }),
                    );
                    if (res.statusCode == 200) {
                      final data = jsonDecode(res.body);
                      final state = data['state'];
                      if (state != null && mounted) {
                        setState(() {
                          _currentPrize = state['prizeName'] ?? _currentPrize;
                          _currentPrizeImage = state['prizeImagePath'];
                          _isGrand = state['isGrand'] ?? false;
                          _grandPrizeId = state['grandPrizeId'];
                        });
                      }
                    }
                  } catch (_) {}
                },
              ),
              const SizedBox(height: 12),

              if (_regularPrizes.isNotEmpty) ...[
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 4.0),
                  child: Text('Regular Prizes:', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.greenAccent, fontSize: 13)),
                ),
                ..._regularPrizes.map((p) => ListTile(
                      dense: true,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      leading: const Icon(Icons.card_giftcard, color: Colors.greenAccent),
                      title: Text(p['name'], style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
                      subtitle: Text('Qty: ${p['quantity'] ?? 1}${p['priority'] != null ? ' • Priority: ${p['priority']}' : ''}',
                          style: const TextStyle(fontSize: 11, color: Colors.grey)),
                      onTap: () async {
                        setState(() {
                          _currentPrize = p['name'];
                          _currentPrizeImage = p['imagePath'];
                          _isGrand = false;
                          _grandPrizeId = null;
                        });
                        Navigator.pop(ctx);
                        try {
                          await http.post(
                            Uri.parse('${widget.serverUrl}/api/wheel/state'),
                            headers: {'Content-Type': 'application/json'},
                            body: jsonEncode({
                              'action': 'SELECT_PRIZE',
                              'prizeName': p['name'],
                              'prizeImagePath': p['imagePath'],
                              'isGrand': false,
                              'location': _activeLocation,
                            }),
                          );
                        } catch (_) {}
                      },
                    )),
              ],

              if (_grandPrizes.isNotEmpty) ...[
                const Divider(color: Colors.white12),
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 4.0),
                  child: Text('Grand Prizes:', style: TextStyle(fontWeight: FontWeight.bold, color: Color(0xFFF59E0B), fontSize: 13)),
                ),
                ..._grandPrizes.map((p) => ListTile(
                      dense: true,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      leading: const Icon(Icons.star, color: Color(0xFFF59E0B)),
                      title: Text(p['name'], style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
                      subtitle: Text('Qty: ${p['quantity'] ?? 1}${p['priority'] != null ? ' • Priority: ${p['priority']}' : ''}',
                          style: const TextStyle(fontSize: 11, color: Colors.grey)),
                      onTap: () async {
                        setState(() {
                          _currentPrize = p['name'];
                          _currentPrizeImage = p['imagePath'];
                          _isGrand = true;
                          _grandPrizeId = p['id'];
                        });
                        Navigator.pop(ctx);
                        try {
                          await http.post(
                            Uri.parse('${widget.serverUrl}/api/wheel/state'),
                            headers: {'Content-Type': 'application/json'},
                            body: jsonEncode({
                              'action': 'SELECT_PRIZE',
                              'prizeName': p['name'],
                              'prizeImagePath': p['imagePath'],
                              'isGrand': true,
                              'grandPrizeId': p['id'],
                              'location': _activeLocation,
                            }),
                          );
                        } catch (_) {}
                      },
                    )),
              ],

              if (_regularPrizes.isEmpty && _grandPrizes.isEmpty)
                const Padding(
                  padding: EdgeInsets.all(16.0),
                  child: Text('No active prizes found in database. Add prizes in Admin Panel.',
                      style: TextStyle(color: Colors.grey, fontStyle: FontStyle.italic)),
                ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    WakelockPlus.disable();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('EMCEE SPIN REMOTE'),
        backgroundColor: Colors.transparent,
        elevation: 0,
        actions: [
          // Keep Awake Toggle
          IconButton(
            icon: Icon(
              _keepScreenAwake ? Icons.wb_sunny : Icons.nightlight_round,
              color: _keepScreenAwake ? Colors.amber : Colors.grey,
            ),
            tooltip: _keepScreenAwake ? 'Screen Keep-Awake ON' : 'Screen Auto-Sleep Allowed',
            onPressed: () => _enableWakelock(!_keepScreenAwake),
          ),
          // Live Spin Controls Slider Icon
          IconButton(
            icon: const Icon(Icons.tune, color: Colors.amber),
            tooltip: 'Live Spin Controls',
            onPressed: _showSpinSettingsDialog,
          ),
          // Refresh / Sync Icon
          IconButton(
            icon: const Icon(Icons.refresh, color: Colors.white70),
            tooltip: 'Refresh & Re-sync State',
            onPressed: () {
              _fetchGrandPrizes();
              _fetchSettings();
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('🔄 Synced wheel state & prize catalog from server'),
                  duration: Duration(seconds: 1),
                  backgroundColor: Color(0xFF1E293B),
                ),
              );
            },
          ),
          const SizedBox(width: 4),
          Row(
            children: [
              Icon(
                _isConnected ? Icons.wifi : Icons.wifi_off,
                color: _isConnected ? Colors.green : Colors.red,
                size: 20,
              ),
              const SizedBox(width: 16),
            ],
          ),
        ],
      ),
      body: SafeArea(
        bottom: true,
        child: SingleChildScrollView(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 8.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Prize Selection Card
                Card(
                  color: const Color(0xFF1E293B),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                  child: ListTile(
                    leading: Icon(
                      _isGrand ? Icons.star : Icons.card_giftcard,
                      color: _isGrand ? Colors.amber : Colors.green,
                      size: 36,
                    ),
                    title: Text(
                      _isGrand ? 'GRAND PRIZE' : 'REGULAR PRIZE',
                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.grey),
                    ),
                    subtitle: Text(
                      _currentPrize,
                      style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: Colors.white),
                    ),
                    trailing: const Icon(Icons.swap_horiz, color: Colors.white70),
                    onTap: _selectPrizeDialog,
                  ),
                ),

                if (_lastWinner != null) ...[
                  const SizedBox(height: 12),
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: const Color(0xFF1E293B),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: Colors.amber, width: 2),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.amber.withValues(alpha: 0.2),
                          blurRadius: 20,
                          spreadRadius: 2,
                        ),
                      ],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Row(
                          children: [
                            const Text('🎉 WINNER ANNOUNCED 🎉',
                                style: TextStyle(color: Colors.amber, fontWeight: FontWeight.bold, fontSize: 12)),
                            const Spacer(),
                            IconButton(
                              icon: const Icon(Icons.close, color: Colors.grey, size: 20),
                              onPressed: _closeWinnerModal,
                              tooltip: 'Dismiss Modal',
                            ),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Text(
                          _lastWinner!['name'] ?? '',
                          style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w900, color: Colors.white),
                        ),
                        Text(
                          '${_lastWinner!['employeeId']} • ${_lastWinner!['department'] ?? 'Attendee'}',
                          style: const TextStyle(fontSize: 13, color: Colors.grey),
                        ),
                        const SizedBox(height: 16),
                        Row(
                          children: [
                            Expanded(
                              child: OutlinedButton(
                                style: OutlinedButton.styleFrom(
                                  side: const BorderSide(color: Colors.redAccent),
                                  foregroundColor: Colors.redAccent,
                                  padding: const EdgeInsets.symmetric(vertical: 12),
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                ),
                                onPressed: _requestRespin,
                                child: const Text('ABSENT', style: TextStyle(fontWeight: FontWeight.bold)),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              flex: 2,
                              child: ElevatedButton.icon(
                                icon: const Icon(Icons.check_circle, size: 20),
                                label: const Text('CONFIRM & CLAIM', style: TextStyle(fontWeight: FontWeight.w900)),
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: const Color(0xFF10B981),
                                  foregroundColor: Colors.white,
                                  padding: const EdgeInsets.symmetric(vertical: 12),
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                ),
                                onPressed: _confirmWinner,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],

                const SizedBox(height: 24),

                // Giant 3D Physical Arcade Spin Trigger Button
                Center(
                  child: Builder(
                    builder: (context) {
                      final bool isDisabled = _isSpinning || _lastWinner != null || _allPrizesClaimed;
                      final double buttonSize = 220;

                      return GestureDetector(
                        onTapDown: isDisabled ? null : (_) => setState(() => _isButtonPressed = true),
                        onTapUp: isDisabled ? null : (_) {
                          setState(() => _isButtonPressed = false);
                          _triggerSpin();
                        },
                        onTapCancel: isDisabled ? null : () => setState(() => _isButtonPressed = false),
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 120),
                          curve: Curves.easeOut,
                          width: buttonSize,
                          height: buttonSize,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            // Metallic Outer Collar / Bezel
                            gradient: LinearGradient(
                              colors: isDisabled
                                  ? [const Color(0xFF2A2D34), const Color(0xFF1E2024)]
                                  : [const Color(0xFF4B5563), const Color(0xFF1F2937), const Color(0xFF111827)],
                              begin: Alignment.topLeft,
                              end: Alignment.bottomRight,
                            ),
                            boxShadow: [
                              // Outer drop shadow on surface
                              BoxShadow(
                                color: Colors.black.withValues(alpha: 0.6),
                                blurRadius: 25,
                                offset: const Offset(0, 15),
                              ),
                              // Neon ambient underglow when active
                              if (!isDisabled)
                                BoxShadow(
                                  color: const Color(0xFF10B981).withValues(alpha: _isButtonPressed ? 0.6 : 0.35),
                                  blurRadius: _isButtonPressed ? 35 : 25,
                                  spreadRadius: _isButtonPressed ? 4 : 2,
                                  offset: const Offset(0, 4),
                                ),
                            ],
                          ),
                          padding: const EdgeInsets.all(12), // Thickness of bezel collar
                          child: Container(
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              // Inner Bevel Socket Rim
                              gradient: LinearGradient(
                                colors: isDisabled
                                    ? [const Color(0xFF15171A), const Color(0xFF23272E)]
                                    : [const Color(0xFF0F172A), const Color(0xFF334155)],
                                begin: Alignment.topCenter,
                                end: Alignment.bottomCenter,
                              ),
                              border: Border.all(
                                color: isDisabled ? Colors.white10 : Colors.white24,
                                width: 2,
                              ),
                            ),
                            padding: const EdgeInsets.all(6),
                            child: AnimatedContainer(
                              duration: const Duration(milliseconds: 90),
                              transform: Matrix4.translationValues(
                                0,
                                _isButtonPressed ? 8.0 : (isDisabled ? 3.0 : 0.0),
                                0,
                              ),
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                // Physical Button Face Gradient
                                gradient: RadialGradient(
                                  center: const Alignment(-0.2, -0.4),
                                  radius: 0.85,
                                  colors: isDisabled
                                      ? [
                                          const Color(0xFF4B5563),
                                          const Color(0xFF374151),
                                          const Color(0xFF1F2937),
                                        ]
                                      : [
                                          const Color(0xFF34D399), // Emerald highlight
                                          const Color(0xFF10B981), // Core emerald
                                          const Color(0xFF047857), // Deep shade
                                          const Color(0xFF064E3B), // Edge bottom
                                        ],
                                  stops: const [0.0, 0.4, 0.8, 1.0],
                                ),
                                boxShadow: [
                                  // Bottom 3D Cylinder Extrusion Edge (flattens when pressed)
                                  if (!_isButtonPressed && !isDisabled)
                                    BoxShadow(
                                      color: const Color(0xFF022C22),
                                      offset: const Offset(0, 8),
                                      blurRadius: 0,
                                    ),
                                  if (!_isButtonPressed && isDisabled)
                                    BoxShadow(
                                      color: const Color(0xFF111827),
                                      offset: const Offset(0, 4),
                                      blurRadius: 0,
                                    ),
                                  // Top glossy lens reflection
                                  BoxShadow(
                                    color: Colors.white.withValues(alpha: isDisabled ? 0.05 : 0.35),
                                    offset: const Offset(0, -3),
                                    blurRadius: 6,
                                  ),
                                ],
                              ),
                              child: Stack(
                                children: [
                                  // 3D Glass Arc Highlight across top rim
                                  Positioned(
                                    top: 10,
                                    left: 25,
                                    right: 25,
                                    height: 55,
                                    child: Container(
                                      decoration: BoxDecoration(
                                        borderRadius: const BorderRadius.vertical(top: Radius.circular(80)),
                                        gradient: LinearGradient(
                                          begin: Alignment.topCenter,
                                          end: Alignment.bottomCenter,
                                          colors: [
                                            Colors.white.withValues(alpha: isDisabled ? 0.08 : 0.4),
                                            Colors.white.withValues(alpha: 0.0),
                                          ],
                                        ),
                                      ),
                                    ),
                                  ),
                                  // Button Label & Icon
                                  Center(
                                    child: Column(
                                      mainAxisAlignment: MainAxisAlignment.center,
                                      children: [
                                        Icon(
                                          _allPrizesClaimed
                                              ? Icons.emoji_events
                                              : _isSpinning
                                                  ? Icons.hourglass_top
                                                  : (_lastWinner != null ? Icons.lock : Icons.touch_app),
                                          size: 58,
                                          color: isDisabled ? Colors.grey.shade400 : Colors.white,
                                          shadows: [
                                            Shadow(
                                              color: Colors.black.withValues(alpha: 0.7),
                                              blurRadius: 8,
                                              offset: const Offset(0, 3),
                                            ),
                                          ],
                                        ),
                                        const SizedBox(height: 4),
                                        Text(
                                          _allPrizesClaimed
                                              ? 'ALL CLAIMED'
                                              : _isSpinning
                                                  ? 'SPINNING...'
                                                  : (_lastWinner != null ? 'AWAITING CLAIM' : 'SPIN!'),
                                          textAlign: TextAlign.center,
                                          style: TextStyle(
                                            fontSize: (_lastWinner != null || _allPrizesClaimed) ? 14 : 24,
                                            fontWeight: FontWeight.w900,
                                            letterSpacing: 2,
                                            color: isDisabled ? Colors.grey.shade400 : Colors.white,
                                            shadows: [
                                              Shadow(
                                                color: Colors.black.withValues(alpha: 0.8),
                                                blurRadius: 6,
                                                offset: const Offset(0, 2),
                                              ),
                                            ],
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                ),
                const SizedBox(height: 32),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
