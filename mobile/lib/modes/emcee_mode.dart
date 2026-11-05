import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:vibration/vibration.dart';
import 'package:http/http.dart' as http;
import 'package:wakelock_plus/wakelock_plus.dart';

class EmceeRemoteScreen extends StatefulWidget {
  final String serverUrl;
  final String location;
  const EmceeRemoteScreen({super.key, required this.serverUrl, this.location = 'TAYUD'});

  @override
  State<EmceeRemoteScreen> createState() => _EmceeRemoteScreenState();
}

class _EmceeRemoteScreenState extends State<EmceeRemoteScreen> {
  bool _isConnected = false;
  bool _isSpinning = false;
  bool _keepScreenAwake = true;
  String _currentPrize = '1 Sack 5 kl Rice';
  String? _currentPrizeImage;
  bool _isGrand = false;
  int? _grandPrizeId;
  List<dynamic> _grandPrizes = [];
  List<dynamic> _regularPrizes = [];
  Timer? _pollTimer;
  Map<String, dynamic>? _lastWinner;

  // Spin Settings
  int _duration = 8;
  String _power = 'high';

  @override
  void initState() {
    super.initState();
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
    _pollTimer = Timer.periodic(const Duration(milliseconds: 1000), (_) async {
      try {
        final res = await http.get(Uri.parse('${widget.serverUrl}/api/wheel/state')).timeout(const Duration(seconds: 2));
        if (res.statusCode == 200) {
          final data = jsonDecode(res.body);
          final state = data['state'];
          if (mounted) {
            setState(() {
              _isConnected = true;
              final serverStatus = state['status'];
              if (serverStatus == 'IDLE' && _isSpinning) {
                _isSpinning = false;
                if (state['winner'] != null) {
                  _lastWinner = state['winner'];
                  Vibration.vibrate(duration: 400);
                }
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
      final locParam = widget.location != 'ALL' ? '?location=${widget.location}' : '';
      final res = await http.get(Uri.parse('${widget.serverUrl}/api/wheel$locParam'));
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        setState(() {
          _grandPrizes = data['grandPrizes'] ?? [];
          _regularPrizes = data['regularPrizes'] ?? [];
          // Pick first regular prize if available
          if (_regularPrizes.isNotEmpty && _currentPrize == '1 Sack 5 kl Rice') {
            _currentPrize = _regularPrizes.first['name'];
            _currentPrizeImage = _regularPrizes.first['imagePath'];
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
        setState(() {
          _duration = data['duration'] ?? 8;
          _power = data['power'] ?? 'high';
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
    if (_isSpinning) return;
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
          'location': widget.location,
        }),
      );

      if (res.statusCode != 200) {
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
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Select Draw Prize'),
        content: SizedBox(
          width: double.maxFinite,
          child: ListView(
            shrinkWrap: true,
            children: [
              const Text('Regular Prizes:', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.green)),
              ..._regularPrizes.map((p) => ListTile(
                    leading: const Icon(Icons.card_giftcard, color: Colors.green),
                    title: Text(p['name']),
                    subtitle: Text('Qty: ${p['quantity'] ?? 1}'),
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
                            'location': widget.location,
                          }),
                        );
                      } catch (_) {}
                    },
                  )),
              if (_regularPrizes.isEmpty)
                ListTile(
                  leading: const Icon(Icons.card_giftcard, color: Colors.green),
                  title: const Text('1 Sack 5 kl Rice (Regular)'),
                  onTap: () async {
                    setState(() {
                      _currentPrize = '1 Sack 5 kl Rice';
                      _currentPrizeImage = null;
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
                          'prizeName': '1 Sack 5 kl Rice',
                          'isGrand': false,
                        }),
                      );
                    } catch (_) {}
                  },
                ),
              const Divider(),
              const Text('Grand Prizes:', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.amber)),
              ..._grandPrizes.map((p) => ListTile(
                    leading: const Icon(Icons.star, color: Colors.amber),
                    title: Text(p['name']),
                    subtitle: Text('Qty: ${p['quantity'] ?? 1}'),
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
                            'location': widget.location,
                          }),
                        );
                      } catch (_) {}
                    },
                  )),
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

                // Giant Spin Trigger Button (Disabled while a winner is awaiting confirmation)
                Center(
                  child: GestureDetector(
                    onTap: (_isSpinning || _lastWinner != null) ? null : _triggerSpin,
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 300),
                      width: 220,
                      height: 220,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        gradient: LinearGradient(
                          colors: (_isSpinning || _lastWinner != null)
                              ? [Colors.grey.shade800, Colors.grey.shade900]
                              : [const Color(0xFF10B981), const Color(0xFF047857)],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: (_isSpinning || _lastWinner != null)
                                ? Colors.transparent
                                : const Color(0xFF10B981).withValues(alpha: 0.4),
                            blurRadius: 30,
                            spreadRadius: 5,
                          )
                        ],
                      ),
                      child: Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              _isSpinning
                                  ? Icons.hourglass_top
                                  : (_lastWinner != null ? Icons.lock : Icons.play_arrow),
                              size: 64,
                              color: (_isSpinning || _lastWinner != null) ? Colors.grey.shade500 : Colors.white,
                            ),
                            const SizedBox(height: 6),
                            Text(
                              _isSpinning
                                  ? 'SPINNING...'
                                  : (_lastWinner != null ? 'AWAITING CLAIM' : 'SPIN!'),
                              style: TextStyle(
                                fontSize: _lastWinner != null ? 14 : 24,
                                fontWeight: FontWeight.w900,
                                letterSpacing: 2,
                                color: (_isSpinning || _lastWinner != null) ? Colors.grey.shade500 : Colors.white,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
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
