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
  bool _isLoading = false;
  Map<String, dynamic>? _guestResult;
  String? _errorMessage;

  // Feedback states
  int _overallRating = 5;
  bool _showCategories = false;
  bool _feedbackSubmitted = false;
  bool _isSubmittingFeedback = false;
  final _commentController = TextEditingController();

  final Map<String, int> _categoryRatings = {
    'food': 5,
    'drinks': 5,
    'program': 5,
    'venue': 5,
    'raffle': 5,
    'decor': 5,
    'games': 5,
    'presentations': 5,
  };

  final List<Map<String, String>> _categoryMeta = [
    {'key': 'food', 'label': 'Food', 'icon': '🍲'},
    {'key': 'drinks', 'label': 'Drinks', 'icon': '🍹'},
    {'key': 'program', 'label': 'Program', 'icon': '🎤'},
    {'key': 'venue', 'label': 'Venue', 'icon': '🏛️'},
    {'key': 'raffle', 'label': 'Raffle', 'icon': '🎡'},
    {'key': 'decor', 'label': 'Decor', 'icon': '✨'},
    {'key': 'games', 'label': 'Games', 'icon': '🎯'},
    {'key': 'presentations', 'label': 'Presentations', 'icon': '📊'},
  ];

  Future<void> _submitFeedback() async {
    if (_guestResult == null) return;
    setState(() => _isSubmittingFeedback = true);

    try {
      final res = await http.post(
        Uri.parse('${widget.serverUrl}/api/feedback'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'rating': _overallRating,
          'employeeId': _guestResult!['employeeId'],
          'name': _guestResult!['fullName'],
          'location': _guestResult!['location'] ?? 'ALL',
          'foodRating': _categoryRatings['food'],
          'drinksRating': _categoryRatings['drinks'],
          'programRating': _categoryRatings['program'],
          'venueRating': _categoryRatings['venue'],
          'raffleRating': _categoryRatings['raffle'],
          'decorRating': _categoryRatings['decor'],
          'gamesRating': _categoryRatings['games'],
          'presentationsRating': _categoryRatings['presentations'],
          'comment': _commentController.text.trim(),
        }),
      );

      if (res.statusCode == 200) {
        setState(() => _feedbackSubmitted = true);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('🎉 Thank you for your feedback!'),
              backgroundColor: Colors.green,
            ),
          );
        }
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Could not submit feedback. Try again later.')),
        );
      }
    } finally {
      setState(() => _isSubmittingFeedback = false);
    }
  }

  Future<void> _checkStatus() async {
    final empId = _empIdController.text.trim();
    final lastName = _lastNameController.text.trim();

    if (empId.isEmpty || lastName.isEmpty) {
      setState(() {
        _errorMessage = 'Please enter both Employee ID and Last Name.';
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
      final res = await http.post(
        Uri.parse('${widget.serverUrl}/api/check-status'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'employeeId': empId,
          'lastName': lastName,
        }),
      );

      final data = jsonDecode(res.body);

      if (res.statusCode == 200 && data['found'] == true) {
        setState(() {
          _guestResult = data['guest'];
          _errorMessage = null;
          _feedbackSubmitted = false;
        });
      } else {
        setState(() {
          _errorMessage = data['message'] ?? 'No record found matching Employee ID and Last Name.';
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

            // Form inputs
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
    if (_feedbackSubmitted) {
      return Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: const Color(0xFF10B981).withValues(alpha: 0.15),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: const Color(0xFF10B981).withValues(alpha: 0.4)),
        ),
        child: const Column(
          children: [
            Text('🎉🌟', style: TextStyle(fontSize: 28)),
            SizedBox(height: 6),
            Text(
              'Thank you for your feedback!',
              style: TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF10B981), fontSize: 15),
            ),
            SizedBox(height: 4),
            Text(
              'Your response helps make future Avega events even better.',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.grey, fontSize: 12),
            ),
          ],
        ),
      );
    }

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: const Color(0xFF1E293B),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFF59E0B).withValues(alpha: 0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Text('⭐', style: TextStyle(fontSize: 18)),
                  SizedBox(width: 8),
                  Text(
                    'EVENT FEEDBACK',
                    style: TextStyle(fontWeight: FontWeight.bold, color: Color(0xFFF59E0B), fontSize: 13, letterSpacing: 1),
                  ),
                ],
              ),
              Text('10-sec review', style: TextStyle(fontSize: 10, color: Colors.grey)),
            ],
          ),
          const SizedBox(height: 10),
          const Text(
            'How is your experience at the event so far?',
            style: TextStyle(fontSize: 13, color: Colors.white70),
          ),
          const SizedBox(height: 12),

          // 5-Star Tap Bar
          Container(
            padding: const EdgeInsets.symmetric(vertical: 8),
            decoration: BoxDecoration(
              color: const Color(0xFF0F172A),
              borderRadius: BorderRadius.circular(14),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [1, 2, 3, 4, 5].map((star) {
                return IconButton(
                  icon: Icon(
                    star <= _overallRating ? Icons.star : Icons.star_border,
                    color: const Color(0xFFF59E0B),
                    size: 32,
                  ),
                  onPressed: () => setState(() => _overallRating = star),
                );
              }).toList(),
            ),
          ),
          const SizedBox(height: 8),

          // Toggle Categories
          Center(
            child: TextButton(
              onPressed: () => setState(() => _showCategories = !_showCategories),
              child: Text(
                _showCategories ? 'Hide Category Ratings ▲' : 'Rate Food, Drinks, Games & more (Optional) ▼',
                style: const TextStyle(fontSize: 11, color: Color(0xFFF59E0B), fontWeight: FontWeight.bold),
              ),
            ),
          ),

          if (_showCategories) ...[
            const SizedBox(height: 8),
            ..._categoryMeta.map((cat) {
              final key = cat['key']!;
              final currentVal = _categoryRatings[key] ?? 5;
              return Padding(
                padding: const EdgeInsets.symmetric(vertical: 4.0),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      '${cat['icon']} ${cat['label']}',
                      style: const TextStyle(fontSize: 12, color: Colors.white70, fontWeight: FontWeight.w600),
                    ),
                    Row(
                      children: [1, 2, 3, 4, 5].map((n) {
                        return GestureDetector(
                          onTap: () => setState(() => _categoryRatings[key] = n),
                          child: Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 2.0),
                            child: Icon(
                              Icons.star,
                              size: 18,
                              color: n <= currentVal ? const Color(0xFFF59E0B) : Colors.grey.shade800,
                            ),
                          ),
                        );
                      }).toList(),
                    ),
                  ],
                ),
              );
            }),
            const SizedBox(height: 12),
            TextField(
              controller: _commentController,
              maxLines: 2,
              decoration: InputDecoration(
                hintText: 'Any suggestion or shoutout for the committee? (Optional)',
                hintStyle: const TextStyle(fontSize: 11, color: Colors.grey),
                filled: true,
                fillColor: const Color(0xFF0F172A),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
              ),
              style: const TextStyle(fontSize: 12),
            ),
            const SizedBox(height: 8),
          ],

          const SizedBox(height: 8),
          ElevatedButton.icon(
            icon: _isSubmittingFeedback
                ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.black))
                : const Icon(Icons.send, size: 16, color: Colors.black),
            label: Text(
              _isSubmittingFeedback ? 'SUBMITTING...' : 'SEND FEEDBACK ✨',
              style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.black, fontSize: 13),
            ),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFF59E0B),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              padding: const EdgeInsets.symmetric(vertical: 12),
            ),
            onPressed: _isSubmittingFeedback ? null : _submitFeedback,
          ),
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
