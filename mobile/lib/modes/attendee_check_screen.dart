import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;

class AttendeeCheckScreen extends StatefulWidget {
  final String serverUrl;
  const AttendeeCheckScreen({super.key, required this.serverUrl});

  @override
  State<AttendeeCheckScreen> createState() => _AttendeeCheckScreenState();
}

class _AttendeeCheckScreenState extends State<AttendeeCheckScreen> {
  final _empIdController = TextEditingController();
  final _lastNameController = TextEditingController();
  final _guestSearchController = TextEditingController();
  bool _isGuestMode = false;
  bool _isLoading = false;
  Map<String, dynamic>? _guestResult;
  String? _errorMessage;
  bool _isFormCollapsed = false;

  // Feedback states
  int _currentStep = 0; // 0 to _categorySteps.length - 1 (ratings), _categorySteps.length = comment, > length = complete
  String _saveStatus = 'idle'; // 'idle', 'saving', 'saved'
  Timer? _saveTimer;
  final _commentController = TextEditingController();

  final Map<String, int?> _ratings = {
    'overall': null,
    'food': null,
    'drinks': null,
    'program': null,
    'venue': null,
    'raffle': null,
    'decor': null,
    'games': null,
    'presentations': null,
  };

  final List<Map<String, String>> _categorySteps = [
    {
      'key': 'overall',
      'label': 'Overall Experience',
      'subtitle': 'How is your overall event experience so far?',
      'icon': '⭐',
    },
    {
      'key': 'food',
      'label': 'Food & Catering',
      'subtitle': 'How was the food quality and catering?',
      'icon': '🍲',
    },
    {
      'key': 'drinks',
      'label': 'Drinks & Bar',
      'subtitle': 'How were the drinks, juices, and beverages?',
      'icon': '🍹',
    },
    {
      'key': 'program',
      'label': 'Program & Emcees',
      'subtitle': 'How was the event program, hosting, and flow?',
      'icon': '🎤',
    },
    {
      'key': 'venue',
      'label': 'Venue & Comfort',
      'subtitle': 'How was the venue space, seating, and ambiance?',
      'icon': '🏛️',
    },
    {
      'key': 'raffle',
      'label': 'Raffle & Prizes',
      'subtitle': 'Excited for the prizes and wheel draws?',
      'icon': '🎡',
    },
    {
      'key': 'decor',
      'label': 'Decor & Theme',
      'subtitle': 'How do you like the stage and venue decoration?',
      'icon': '✨',
    },
    {
      'key': 'games',
      'label': 'Games & Activities',
      'subtitle': 'How engaging and fun were the party games?',
      'icon': '🎯',
    },
    {
      'key': 'presentations',
      'label': 'Presentations & Show',
      'subtitle': 'How did you enjoy the special performances?',
      'icon': '📊',
    },
  ];

  @override
  void dispose() {
    _saveTimer?.cancel();
    _empIdController.dispose();
    _lastNameController.dispose();
    _commentController.dispose();
    super.dispose();
  }

  void _triggerAutoSave() {
    if (_guestResult == null) return;
    _saveTimer?.cancel();
    setState(() => _saveStatus = 'saving');

    _saveTimer = Timer(const Duration(milliseconds: 500), () async {
      try {
        final res = await http.post(
          Uri.parse('${widget.serverUrl}/api/feedback'),
          headers: {'Content-Type': 'application/json'},
          body: jsonEncode({
            'rating': _ratings['overall'] ?? 5,
            'employeeId': _guestResult!['employeeId'],
            'name': _guestResult!['fullName'],
            'location': _guestResult!['location'] ?? 'ALL',
            'foodRating': _ratings['food'],
            'drinksRating': _ratings['drinks'],
            'programRating': _ratings['program'],
            'venueRating': _ratings['venue'],
            'raffleRating': _ratings['raffle'],
            'decorRating': _ratings['decor'],
            'gamesRating': _ratings['games'],
            'presentationsRating': _ratings['presentations'],
            'comment': _commentController.text.trim(),
          }),
        );

        if (res.statusCode == 200 && mounted) {
          setState(() => _saveStatus = 'saved');
          Future.delayed(const Duration(seconds: 3), () {
            if (mounted && _saveStatus == 'saved') {
              setState(() => _saveStatus = 'idle');
            }
          });
        } else if (mounted) {
          setState(() => _saveStatus = 'idle');
        }
      } catch (_) {
        if (mounted) setState(() => _saveStatus = 'idle');
      }
    });
  }

  void _handleRate(int score) {
    if (_currentStep < _categorySteps.length) {
      final key = _categorySteps[_currentStep]['key']!;
      setState(() {
        _ratings[key] = score;
      });
      _triggerAutoSave();

      // Smooth auto-advance
      Future.delayed(const Duration(milliseconds: 280), () {
        if (mounted) {
          setState(() => _currentStep++);
        }
      });
    }
  }

  Future<void> _checkStatus() async {
    final empId = _empIdController.text.trim();
    final lastName = _lastNameController.text.trim();
    final guestQuery = _guestSearchController.text.trim();

    if (!_isGuestMode && (empId.isEmpty || lastName.isEmpty)) {
      setState(() {
        _errorMessage = 'Please enter both Employee ID and Last Name.';
        _guestResult = null;
      });
      return;
    }

    if (_isGuestMode && guestQuery.isEmpty) {
      setState(() {
        _errorMessage = 'Please enter your Guest Tag, ID, or Name.';
        _guestResult = null;
      });
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
      _guestResult = null;
    });

    try {
      final Map<String, dynamic> requestBody = _isGuestMode
          ? {'employeeId': guestQuery, 'fullName': guestQuery}
          : {'employeeId': empId, 'lastName': lastName};

      final res = await http.post(
        Uri.parse('${widget.serverUrl}/api/check-status'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode(requestBody),
      );

      final data = jsonDecode(res.body);

      if (res.statusCode == 200 && data['found'] == true) {
        setState(() {
          _guestResult = data['guest'];
          _errorMessage = null;
          _saveStatus = 'idle';
          _isFormCollapsed = true;
        });
      } else {
        setState(() {
          _errorMessage = data['message'] ?? 'No registration record found.';
          _guestResult = null;
        });
      }
    } catch (e) {
      setState(() {
        _errorMessage = 'Unable to reach raffle server. Check your connection.';
        _guestResult = null;
      });
    } finally {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        title: const Text('ATTENDEE RAFFLE CHECK', style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: Colors.transparent,
        elevation: 0,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Header card
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF1E293B), Color(0xFF0F172A)],
                ),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: Colors.white12),
              ),
              child: const Column(
                children: [
                  Icon(Icons.verified_user, size: 48, color: Color(0xFFF59E0B)),
                  SizedBox(height: 12),
                  Text(
                    'Check Raffle Eligibility',
                    style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.white),
                  ),
                  SizedBox(height: 6),
                  Text(
                    'Verify if your registration and raffle entry are active on the wheel.',
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 12, color: Colors.grey),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Collapsible Form Inputs
            if (_isFormCollapsed && _guestResult != null)
              Container(
                margin: const EdgeInsets.only(bottom: 16),
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                decoration: BoxDecoration(
                  color: const Color(0xFF1E293B),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: Colors.white10),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.person, size: 16, color: Color(0xFFF59E0B)),
                        const SizedBox(width: 8),
                        Text(
                          _isGuestMode
                              ? '${_guestResult!['employeeId']} • ${_guestResult!['fullName']}'
                              : '${_empIdController.text} • ${_lastNameController.text}',
                          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.white),
                        ),
                      ],
                    ),
                    TextButton(
                      style: TextButton.styleFrom(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        minimumSize: Size.zero,
                        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                      ),
                      onPressed: () => setState(() => _isFormCollapsed = false),
                      child: const Text('Change ID ↻', style: TextStyle(color: Color(0xFFF59E0B), fontSize: 11, fontWeight: FontWeight.bold)),
                    ),
                  ],
                ),
              )
            else ...[
              // Toggle between Employee and Guest / VIP
              Container(
                margin: const EdgeInsets.only(bottom: 16),
                padding: const EdgeInsets.all(4),
                decoration: BoxDecoration(
                  color: const Color(0xFF1E293B),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: Colors.white10),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: GestureDetector(
                        onTap: () => setState(() => _isGuestMode = false),
                        child: Container(
                          padding: const EdgeInsets.symmetric(vertical: 8),
                          decoration: BoxDecoration(
                            color: !_isGuestMode ? const Color(0xFFF59E0B) : Colors.transparent,
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Text(
                            '🏢 Employee ID',
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              color: !_isGuestMode ? Colors.black : Colors.grey,
                              fontWeight: FontWeight.bold,
                              fontSize: 12,
                            ),
                          ),
                        ),
                      ),
                    ),
                    Expanded(
                      child: GestureDetector(
                        onTap: () => setState(() => _isGuestMode = true),
                        child: Container(
                          padding: const EdgeInsets.symmetric(vertical: 8),
                          decoration: BoxDecoration(
                            color: _isGuestMode ? const Color(0xFFF59E0B) : Colors.transparent,
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Text(
                            '🎟️ Guest / VIP',
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              color: _isGuestMode ? Colors.black : Colors.grey,
                              fontWeight: FontWeight.bold,
                              fontSize: 12,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),

              if (!_isGuestMode) ...[
                TextField(
                  controller: _empIdController,
                  textCapitalization: TextCapitalization.characters,
                  decoration: InputDecoration(
                    labelText: 'Employee ID (e.g. ABMCI-251102)',
                    prefixIcon: const Icon(Icons.badge, color: Color(0xFFF59E0B)),
                    filled: true,
                    fillColor: const Color(0xFF1E293B),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide.none),
                  ),
                ),
                const SizedBox(height: 16),

                TextField(
                  controller: _lastNameController,
                  decoration: InputDecoration(
                    labelText: 'Last Name / Surname',
                    prefixIcon: const Icon(Icons.person, color: Color(0xFFF59E0B)),
                    filled: true,
                    fillColor: const Color(0xFF1E293B),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide.none),
                  ),
                ),
              ] else ...[
                TextField(
                  controller: _guestSearchController,
                  decoration: InputDecoration(
                    labelText: 'Guest Tag, ID or Name',
                    hintText: 'e.g. GUEST-001 or Full Name',
                    prefixIcon: const Icon(Icons.confirmation_number, color: Color(0xFFF59E0B)),
                    filled: true,
                    fillColor: const Color(0xFF1E293B),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide.none),
                  ),
                ),
                const SizedBox(height: 6),
                const Padding(
                  padding: EdgeInsets.symmetric(horizontal: 4.0),
                  child: Text(
                    'Enter your guest badge tag (e.g. GUEST-001) or full name given at registration.',
                    style: TextStyle(color: Colors.grey, fontSize: 11),
                  ),
                ),
              ],
              const SizedBox(height: 20),

              ElevatedButton.icon(
                icon: _isLoading
                    ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.black))
                    : const Icon(Icons.search, color: Colors.black),
                label: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 14.0),
                  child: Text(
                    _isLoading ? 'VERIFYING...' : 'CHECK MY STATUS',
                    style: const TextStyle(color: Colors.black, fontWeight: FontWeight.bold, fontSize: 16),
                  ),
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFFF59E0B),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                ),
                onPressed: _isLoading ? null : _checkStatus,
              ),
              const SizedBox(height: 24),
            ],

            // Error Message
            if (_errorMessage != null)
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.redAccent.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: Colors.redAccent.withValues(alpha: 0.4)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.error_outline, color: Colors.redAccent),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(_errorMessage!, style: const TextStyle(color: Colors.redAccent, fontSize: 13)),
                    ),
                  ],
                ),
              ),

            // Success Result Card
            if (_guestResult != null) ...[
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: const Color(0xFF1E293B),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                    color: _guestResult!['inWheel'] == true ? const Color(0xFF10B981) : const Color(0xFFF59E0B),
                    width: 2,
                  ),
                ),
                child: Column(
                  children: [
                    Row(
                      children: [
                        // Avatar thumbnail
                        Container(
                          width: 60,
                          height: 60,
                          decoration: BoxDecoration(
                            color: const Color(0xFF0F172A),
                            borderRadius: BorderRadius.circular(30),
                            border: Border.all(color: const Color(0xFFF59E0B)),
                          ),
                          child: _guestResult!['avatar'] != null
                              ? ClipRRect(
                                  borderRadius: BorderRadius.circular(30),
                                  child: Image.network(
                                    '${widget.serverUrl}${_guestResult!['avatar']}',
                                    fit: BoxFit.cover,
                                    errorBuilder: (_, _, _) => Center(
                                      child: Text(
                                        _guestResult!['lastName']?[0] ?? '?',
                                        style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Colors.white),
                                      ),
                                    ),
                                  ),
                                )
                              : Center(
                                  child: Text(
                                    _guestResult!['lastName']?[0] ?? '?',
                                    style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Colors.white),
                                  ),
                                ),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                _guestResult!['fullName'] ?? '',
                                style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                '${_guestResult!['department'] ?? 'Avega Group'}',
                                style: const TextStyle(fontSize: 12, color: Colors.grey),
                              ),
                              Text(
                                'ID: ${_guestResult!['employeeId'] ?? ''}',
                                style: const TextStyle(fontSize: 11, color: Color(0xFFF59E0B), fontFamily: 'monospace'),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const Divider(height: 30, color: Colors.white12),

                    // Status details
                    _buildStatusRow(
                      'Attendance Status',
                      _guestResult!['isRegistered'] == true ? 'REGISTERED & CHECKED-IN' : 'NOT CHECKED-IN YET',
                      _guestResult!['isRegistered'] == true ? Colors.green : Colors.amber,
                    ),
                    const SizedBox(height: 10),
                    _buildStatusRow(
                      'Raffle Wheel Status',
                      _guestResult!['isWinner'] == true
                          ? '🎉 WON PRIZE: ${_guestResult!['prizeWon'] ?? 'Claimed'}'
                          : _guestResult!['inWheel'] == true
                              ? 'ACTIVE ON THE WHEEL 🎡'
                              : 'NOT IN WHEEL',
                      _guestResult!['isWinner'] == true
                          ? Colors.amber
                          : _guestResult!['inWheel'] == true
                              ? Colors.green
                              : Colors.redAccent,
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 16),

              // ==========================================
              // NON-INTRUSIVE EVENT FEEDBACK CARD
              // ==========================================
              _buildFeedbackCard(),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildFeedbackCard() {
    final totalSteps = _categorySteps.length + 1; // 9 questions + 1 comment
    final isCommentStep = _currentStep == _categorySteps.length;
    final isCompleted = _currentStep > _categorySteps.length;

    if (isCompleted) {
      return Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: const Color(0xFF1E293B),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: const Color(0xFF10B981).withValues(alpha: 0.4)),
        ),
        child: Column(
          children: [
            const Text('🎉🌟', style: TextStyle(fontSize: 32)),
            const SizedBox(height: 8),
            Text(
              'Thank you, ${_guestResult!['firstName'] ?? 'Avegan'}!',
              textAlign: TextAlign.center,
              style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF10B981), fontSize: 16),
            ),
            const SizedBox(height: 4),
            const Text(
              'Your feedback has been recorded and will help make future company events even better.',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.white70, fontSize: 12),
            ),
            const SizedBox(height: 12),
            TextButton(
              onPressed: () => setState(() => _currentStep = 0),
              child: const Text(
                'Review or Edit Ratings ↺',
                style: TextStyle(color: Colors.grey, fontSize: 11, fontWeight: FontWeight.bold),
              ),
            ),
          ],
        ),
      );
    }

    final activeMeta = !isCommentStep ? _categorySteps[_currentStep] : null;
    final currentScore = activeMeta != null ? _ratings[activeMeta['key']] : null;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF1E293B),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFF59E0B).withValues(alpha: 0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Header with step and autosave status
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  const Text('⭐', style: TextStyle(fontSize: 15)),
                  const SizedBox(width: 6),
                  const Text(
                    'EVENT FEEDBACK',
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      color: Color(0xFFF59E0B),
                      fontSize: 11,
                      letterSpacing: 1,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF59E0B).withValues(alpha: 0.2),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      '${_currentStep + 1} of $totalSteps',
                      style: const TextStyle(fontSize: 10, color: Color(0xFFF59E0B), fontWeight: FontWeight.bold),
                    ),
                  ),
                ],
              ),
              if (_saveStatus == 'saving')
                const Row(
                  children: [
                    SizedBox(
                      width: 10,
                      height: 10,
                      child: CircularProgressIndicator(strokeWidth: 1.5, color: Color(0xFFF59E0B)),
                    ),
                    SizedBox(width: 4),
                    Text('Saving...', style: TextStyle(fontSize: 10, color: Color(0xFFF59E0B), fontWeight: FontWeight.bold)),
                  ],
                )
              else if (_saveStatus == 'saved')
                const Text('✓ Saved!', style: TextStyle(fontSize: 10, color: Color(0xFF10B981), fontWeight: FontWeight.bold))
              else
                const Text('⚡ Auto-saves', style: TextStyle(fontSize: 10, color: Colors.grey)),
            ],
          ),
          const SizedBox(height: 8),

          // Progress Bar
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: (_currentStep + 1) / totalSteps,
              minHeight: 4,
              backgroundColor: const Color(0xFF0F172A),
              valueColor: const AlwaysStoppedAnimation<Color>(Color(0xFFF59E0B)),
            ),
          ),
          const SizedBox(height: 14),

          // 1-at-a-time Card Content
          if (!isCommentStep) ...[
            Center(
              child: Text(
                activeMeta!['icon']!,
                style: const TextStyle(fontSize: 34),
              ),
            ),
            const SizedBox(height: 6),
            Text(
              activeMeta['label']!,
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Colors.white),
            ),
            const SizedBox(height: 4),
            Text(
              activeMeta['subtitle']!,
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 11, color: Colors.white70),
            ),
            const SizedBox(height: 14),

            // Large Star Buttons (Hollow until tapped)
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [1, 2, 3, 4, 5].map((star) {
                final isSelected = currentScore != null && currentScore >= star;
                return GestureDetector(
                  onTap: () => _handleRate(star),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 6.0),
                    child: Icon(
                      isSelected ? Icons.star : Icons.star_border,
                      size: 38,
                      color: isSelected ? const Color(0xFFF59E0B) : Colors.grey.shade600,
                    ),
                  ),
                );
              }).toList(),
            ),
            const SizedBox(height: 6),
            const Center(
              child: Text(
                'Tap a star to rate & continue',
                style: TextStyle(fontSize: 10, color: Color(0xFFF59E0B)),
              ),
            ),
            const SizedBox(height: 12),

            // Navigation buttons (Back / Skip)
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                if (_currentStep > 0)
                  TextButton(
                    onPressed: () => setState(() => _currentStep--),
                    child: const Text('← Back', style: TextStyle(color: Colors.grey, fontSize: 11)),
                  )
                else
                  const SizedBox.shrink(),
                TextButton(
                  onPressed: () => setState(() => _currentStep++),
                  child: const Text('Skip →', style: TextStyle(color: Colors.grey, fontSize: 11)),
                ),
              ],
            ),
          ] else ...[
            // Comment / Suggestion Step
            const Center(child: Text('💬', style: TextStyle(fontSize: 32))),
            const SizedBox(height: 6),
            const Text(
              'Suggestions or Shoutouts (Optional)',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.white),
            ),
            const SizedBox(height: 4),
            const Text(
              'Any message or ideas for the committee?',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 11, color: Colors.white70),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: _commentController,
              maxLines: 3,
              onChanged: (_) => _triggerAutoSave(),
              decoration: InputDecoration(
                hintText: 'Write a note... (saves automatically)',
                hintStyle: const TextStyle(fontSize: 11, color: Colors.grey),
                filled: true,
                fillColor: const Color(0xFF0F172A),
                contentPadding: const EdgeInsets.all(10),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
              ),
              style: const TextStyle(fontSize: 12),
            ),
            const SizedBox(height: 12),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                TextButton(
                  onPressed: () => setState(() => _currentStep--),
                  child: const Text('← Back', style: TextStyle(color: Colors.grey, fontSize: 11)),
                ),
                ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFF59E0B),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  ),
                  onPressed: () {
                    _triggerAutoSave();
                    setState(() => _currentStep = _categorySteps.length + 1);
                  },
                  child: const Text(
                    'Finish Review ✨',
                    style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold, fontSize: 12),
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildStatusRow(String label, String value, Color color) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: const TextStyle(fontSize: 13, color: Colors.grey)),
        Flexible(
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: color.withValues(alpha: 0.5)),
            ),
            child: Text(
              value,
              textAlign: TextAlign.end,
              style: TextStyle(color: color, fontWeight: FontWeight.bold, fontSize: 11),
            ),
          ),
        ),
      ],
    );
  }
}
