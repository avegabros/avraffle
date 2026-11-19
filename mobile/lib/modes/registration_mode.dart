import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:http/http.dart' as http;

class RegistrationScreen extends StatefulWidget {
  final String serverUrl;
  final String location;
  const RegistrationScreen({super.key, required this.serverUrl, this.location = 'ALL'});

  @override
  State<RegistrationScreen> createState() => _RegistrationScreenState();
}

class _RegistrationScreenState extends State<RegistrationScreen> {
  final _searchController = TextEditingController();
  final _picker = ImagePicker();
  List<dynamic> _guests = [];
  bool _isLoading = false;
  bool _isScannerOpen = false;

  @override
  void initState() {
    super.initState();
    _fetchGuests();
  }

  Future<void> _fetchGuests([String query = '']) async {
    setState(() => _isLoading = true);
    try {
      final locParam = widget.location != 'ALL' ? '&location=${widget.location}' : '';
      final res = await http.get(Uri.parse('${widget.serverUrl}/api/guests?q=$query$locParam'));
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        setState(() {
          _guests = data['guests'] ?? [];
        });
      }
    } catch (_) {}
    setState(() => _isLoading = false);
  }

  // Snap Mugshot and complete attendance registration
  Future<void> _checkInWithMugshot(Map<String, dynamic> guest) async {
    XFile? pickedFile;
    try {
      pickedFile = await _picker.pickImage(
        source: ImageSource.camera,
        maxWidth: 800,
        maxHeight: 800,
        imageQuality: 85,
      );
    } catch (e) {
      debugPrint('Camera mugshot error: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Camera error: ${e.toString()}'),
            backgroundColor: Colors.redAccent,
          ),
        );
      }
      return;
    }

    if (pickedFile == null) {
      // User cancelled camera; ask if they want quick check-in without mugshot
      if (!mounted) return;
      final proceed = await showDialog<bool>(
        context: context,
        builder: (ctx) => AlertDialog(
          title: const Text('No Photo Taken'),
          content: Text('Do you want to check in ${guest['firstName']} without a mugshot portrait?'),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
            ElevatedButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Check In Anyway')),
          ],
        ),
      );
      if (proceed != true) return;
    }

    try {
      final req = http.MultipartRequest('POST', Uri.parse('${widget.serverUrl}/api/guests'));
      req.fields['employeeId'] = guest['employeeId'] ?? '';
      req.fields['firstName'] = guest['firstName'] ?? '';
      req.fields['lastName'] = guest['lastName'] ?? '';
      if (guest['department'] != null && guest['department'].toString().isNotEmpty) {
        req.fields['department'] = guest['department'].toString();
      }
      if (guest['position'] != null && guest['position'].toString().isNotEmpty) {
        req.fields['position'] = guest['position'].toString();
      }
      req.fields['location'] = widget.location == 'ALL' ? (guest['location'] ?? 'TAYUD') : widget.location;

      if (pickedFile != null) {
        req.files.add(await http.MultipartFile.fromPath('photo', pickedFile.path));
      }

      final streamedRes = await req.send();
      if (!mounted) return;

      if (streamedRes.statusCode == 200) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                const Icon(Icons.check_circle, color: Colors.white),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    pickedFile != null
                      ? '📸 Checked in with Mugshot: ${guest['firstName']} ${guest['lastName']}!'
                      : '✅ Checked in: ${guest['firstName']} ${guest['lastName']}!',
                    style: const TextStyle(fontWeight: FontWeight.bold),
                  ),
                ),
              ],
            ),
            backgroundColor: Colors.green.shade700,
          ),
        );
        _fetchGuests(_searchController.text.trim());
      }
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Failed to complete check-in with mugshot')),
      );
    }
  }

  // Toggle Wheel Eligibility (inWheel)
  Future<void> _toggleWheelEligibility(Map<String, dynamic> guest) async {
    final currentStatus = guest['inWheel'] == true;
    final newStatus = !currentStatus;

    try {
      final res = await http.patch(
        Uri.parse('${widget.serverUrl}/api/guests/update'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'id': guest['id'],
          'inWheel': newStatus,
        }),
      );

      if (res.statusCode == 200) {
        setState(() {
          guest['inWheel'] = newStatus;
        });
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(
                newStatus
                    ? '🎯 ${guest['firstName']} is now included in the Raffle Wheel!'
                    : '🚫 ${guest['firstName']} is now excluded from the Raffle Wheel.',
              ),
              backgroundColor: newStatus ? Colors.green.shade700 : Colors.orange.shade800,
              duration: const Duration(seconds: 2),
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to update wheel eligibility')),
        );
      }
    }
  }

  // Delete Guest (Only for GUEST-* tags that haven't won)
  Future<void> _deleteGuest(Map<String, dynamic> guest) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF1E293B),
        title: const Text('Delete Guest Entry?'),
        content: Text('Are you sure you want to permanently delete "${guest['firstName']} ${guest['lastName']}" (${guest['employeeId']})?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.redAccent),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Delete', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );

    if (confirm != true) return;

    try {
      final res = await http.delete(
        Uri.parse('${widget.serverUrl}/api/guests?id=${guest['id']}'),
      );
      final data = jsonDecode(res.body);

      if (res.statusCode == 200 && data['success'] == true) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('🗑️ Deleted entry: ${guest['firstName']} ${guest['lastName']}'),
              backgroundColor: Colors.red.shade700,
            ),
          );
        }
        _fetchGuests(_searchController.text.trim());
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(data['error'] ?? 'Failed to delete guest')),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Error deleting guest')),
        );
      }
    }
  }

  // Dialog to register a new attendee or guest who is not on the employee list
  void _showAddGuestDialog() {
    final formKey = GlobalKey<FormState>();
    final defaultId = 'GUEST-${DateTime.now().millisecondsSinceEpoch.toString().substring(7)}';
    final idController = TextEditingController(text: defaultId);
    final firstNameController = TextEditingController();
    final lastNameController = TextEditingController();
    final deptController = TextEditingController(text: 'VIP Guest');
    String selectedLocation = widget.location == 'ALL' ? 'TAYUD' : widget.location;

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          backgroundColor: const Color(0xFF1E293B),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          title: const Row(
            children: [
              Icon(Icons.person_add, color: Color(0xFFF59E0B)),
              SizedBox(width: 10),
              Text('Add Guest / Attendee', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 18)),
            ],
          ),
          content: SingleChildScrollView(
            child: Form(
              key: formKey,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Text(
                    'Add an attendee or guest not in the official HRIS list. They will be added and activated on the wheel.',
                    style: TextStyle(fontSize: 12, color: Colors.grey),
                  ),
                  const SizedBox(height: 16),
                  TextFormField(
                    controller: idController,
                    decoration: const InputDecoration(
                      labelText: 'ID / Guest Tag *',
                      hintText: 'e.g. GUEST-001 or ID',
                      border: OutlineInputBorder(),
                    ),
                    validator: (val) => val == null || val.trim().isEmpty ? 'Required' : null,
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: firstNameController,
                    textCapitalization: TextCapitalization.words,
                    decoration: const InputDecoration(
                      labelText: 'First Name *',
                      border: OutlineInputBorder(),
                    ),
                    validator: (val) => val == null || val.trim().isEmpty ? 'First name is required' : null,
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: lastNameController,
                    textCapitalization: TextCapitalization.words,
                    decoration: const InputDecoration(
                      labelText: 'Last Name *',
                      border: OutlineInputBorder(),
                    ),
                    validator: (val) => val == null || val.trim().isEmpty ? 'Last name is required' : null,
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: deptController,
                    decoration: const InputDecoration(
                      labelText: 'Department / Affiliation',
                      hintText: 'e.g. VIP Guest, Contractor, Partner',
                      border: OutlineInputBorder(),
                    ),
                  ),
                  const SizedBox(height: 12),
                  DropdownButtonFormField<String>(
                    initialValue: selectedLocation,
                    decoration: const InputDecoration(
                      labelText: 'Raffle Event Location',
                      border: OutlineInputBorder(),
                    ),
                    dropdownColor: const Color(0xFF0F172A),
                    items: const [
                      DropdownMenuItem(value: 'TAYUD', child: Text('TAYUD')),
                      DropdownMenuItem(value: 'MAKATI', child: Text('MAKATI')),
                      DropdownMenuItem(value: 'ALL', child: Text('ALL (Unified)')),
                    ],
                    onChanged: (val) {
                      if (val != null) {
                        setDialogState(() => selectedLocation = val);
                      }
                    },
                  ),
                ],
              ),
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Cancel', style: TextStyle(color: Colors.grey)),
            ),
            ElevatedButton.icon(
              icon: const Icon(Icons.camera_alt, color: Colors.black, size: 18),
              label: const Text('Save & Mugshot', style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold)),
              style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFF59E0B)),
              onPressed: () async {
                if (!formKey.currentState!.validate()) return;
                final fName = firstNameController.text.trim();
                final lName = lastNameController.text.trim();

                // Check for potential duplicate against existing guests in system
                final potentialMatch = _guests.firstWhere(
                  (g) =>
                      g['firstName'].toString().trim().toLowerCase() == fName.toLowerCase() &&
                      g['lastName'].toString().trim().toLowerCase() == lName.toLowerCase(),
                  orElse: () => null,
                );

                if (potentialMatch != null) {
                  final proceed = await showDialog<bool>(
                    context: ctx,
                    builder: (alertCtx) => AlertDialog(
                      backgroundColor: const Color(0xFF0F172A),
                      title: const Row(
                        children: [
                          Icon(Icons.warning_amber_rounded, color: Colors.amber),
                          SizedBox(width: 8),
                          Text('Possible Duplicate!'),
                        ],
                      ),
                      content: Text(
                        'Attendee "$fName $lName" already exists in the system:\n\n'
                        '• ID: ${potentialMatch['employeeId']}\n'
                        '• Dept: ${potentialMatch['department'] ?? 'N/A'}\n'
                        '• Status: ${potentialMatch['isRegistered'] == true ? 'Already Registered' : 'Not yet Checked In'}\n\n'
                        'Are you sure you want to create a SECOND duplicate entry?',
                      ),
                      actions: [
                        TextButton(
                          onPressed: () => Navigator.pop(alertCtx, false),
                          child: const Text('Cancel / Use Existing'),
                        ),
                        ElevatedButton(
                          style: ElevatedButton.styleFrom(backgroundColor: Colors.amber.shade700),
                          onPressed: () => Navigator.pop(alertCtx, true),
                          child: const Text('Create Duplicate Anyway', style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold)),
                        ),
                      ],
                    ),
                  );
                  if (proceed != true) return;
                }

                final newGuest = {
                  'employeeId': idController.text.trim(),
                  'firstName': fName,
                  'lastName': lName,
                  'department': deptController.text.trim(),
                  'location': selectedLocation,
                };
                if (ctx.mounted) Navigator.pop(ctx);
                _checkInWithMugshot(newGuest);
              },
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('REGISTRATION DESK'),
        backgroundColor: Colors.transparent,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.person_add, color: Color(0xFFF59E0B)),
            tooltip: 'Add Guest / Attendee',
            onPressed: _showAddGuestDialog,
          ),
          IconButton(
            icon: Icon(_isScannerOpen ? Icons.close : Icons.qr_code_scanner),
            tooltip: 'Scan QR Code',
            onPressed: () => setState(() => _isScannerOpen = !_isScannerOpen),
          ),
        ],
      ),
      body: Column(
        children: [
          if (_isScannerOpen)
            SizedBox(
              height: 240,
              child: MobileScanner(
                onDetect: (capture) {
                  final List<Barcode> barcodes = capture.barcodes;
                  for (final barcode in barcodes) {
                    if (barcode.rawValue != null) {
                      final scannedId = barcode.rawValue!;
                      setState(() {
                        _isScannerOpen = false;
                        _searchController.text = scannedId;
                      });
                      _fetchGuests(scannedId);
                      break;
                    }
                  }
                },
              ),
            ),

          Padding(
            padding: const EdgeInsets.all(16.0),
            child: TextField(
              controller: _searchController,
              decoration: InputDecoration(
                hintText: 'Search Employee ID or Name...',
                prefixIcon: const Icon(Icons.search),
                suffixIcon: IconButton(
                  icon: const Icon(Icons.clear),
                  onPressed: () {
                    _searchController.clear();
                    _fetchGuests();
                  },
                ),
                filled: true,
                fillColor: const Color(0xFF1E293B),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide.none),
              ),
              onSubmitted: (val) => _fetchGuests(val),
            ),
          ),

          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : _guests.isEmpty
                    ? Center(
                        child: Padding(
                          padding: const EdgeInsets.all(24.0),
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              const Icon(Icons.person_search, size: 64, color: Colors.grey),
                              const SizedBox(height: 12),
                              const Text(
                                'No attendees found',
                                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white),
                              ),
                              const SizedBox(height: 6),
                              const Text(
                                'If this attendee is a guest, VIP, or not on the official HRIS employee list, you can add them directly.',
                                textAlign: TextAlign.center,
                                style: TextStyle(color: Colors.grey, fontSize: 13),
                              ),
                              const SizedBox(height: 20),
                              ElevatedButton.icon(
                                icon: const Icon(Icons.person_add, color: Colors.black),
                                label: const Text('ADD AS GUEST / ATTENDEE', style: TextStyle(color: Colors.black, fontWeight: FontWeight.w900)),
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: const Color(0xFFF59E0B),
                                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                ),
                                onPressed: _showAddGuestDialog,
                              ),
                            ],
                          ),
                        ),
                      )
                    : ListView.builder(
                        itemCount: _guests.length,
                        itemBuilder: (ctx, idx) {
                      final guest = _guests[idx];
                      final isCheckedIn = guest['isRegistered'] == true;
                      final inWheel = guest['inWheel'] == true;
                      final isManualGuest = guest['employeeId'].toString().startsWith('GUEST-');

                      return ListTile(
                        leading: CircleAvatar(
                          backgroundColor: isCheckedIn ? Colors.green : Colors.grey.shade700,
                          backgroundImage: guest['thumbPath'] != null || guest['imagePath'] != null
                              ? NetworkImage('${widget.serverUrl}${guest['thumbPath'] ?? guest['imagePath']}')
                              : null,
                          child: (guest['thumbPath'] == null && guest['imagePath'] == null)
                              ? Text(
                                  guest['firstName'][0],
                                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                                )
                              : null,
                        ),
                        title: Row(
                          children: [
                            Expanded(
                              child: Text(
                                '${guest['firstName']} ${guest['lastName']}',
                                style: const TextStyle(fontWeight: FontWeight.bold),
                              ),
                            ),
                            if (!inWheel)
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                decoration: BoxDecoration(
                                  color: Colors.red.withValues(alpha: 0.2),
                                  borderRadius: BorderRadius.circular(4),
                                  border: Border.all(color: Colors.red.withValues(alpha: 0.5)),
                                ),
                                child: const Text(
                                  'NO WHEEL',
                                  style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: Colors.redAccent),
                                ),
                              ),
                          ],
                        ),
                        subtitle: Text('${guest['employeeId']} • ${guest['department'] ?? 'No Dept'}'),
                        trailing: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            ElevatedButton.icon(
                              icon: Icon(
                                isCheckedIn ? Icons.check_circle : Icons.camera_alt,
                                size: 16,
                              ),
                              label: Text(isCheckedIn ? 'Registered' : 'Mugshot'),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: isCheckedIn ? Colors.grey.shade800 : const Color(0xFFF59E0B),
                                foregroundColor: isCheckedIn ? Colors.grey.shade400 : Colors.black,
                                textStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                              ),
                              onPressed: () => _checkInWithMugshot(guest),
                            ),
                            PopupMenuButton<String>(
                              icon: const Icon(Icons.more_vert, size: 20, color: Colors.grey),
                              onSelected: (val) {
                                if (val == 'toggle_wheel') {
                                  _toggleWheelEligibility(guest);
                                } else if (val == 'delete') {
                                  _deleteGuest(guest);
                                }
                              },
                              itemBuilder: (context) => [
                                PopupMenuItem(
                                  value: 'toggle_wheel',
                                  child: Row(
                                    children: [
                                      Icon(
                                        inWheel ? Icons.block : Icons.replay_circle_filled,
                                        size: 18,
                                        color: inWheel ? Colors.orangeAccent : Colors.greenAccent,
                                      ),
                                      const SizedBox(width: 8),
                                      Text(inWheel ? 'Exclude from Wheel' : 'Include in Wheel'),
                                    ],
                                  ),
                                ),
                                if (isManualGuest && guest['isWinner'] != true)
                                  const PopupMenuItem(
                                    value: 'delete',
                                    child: Row(
                                      children: [
                                        Icon(Icons.delete_forever, size: 18, color: Colors.redAccent),
                                        SizedBox(width: 8),
                                        Text('Delete Guest Entry', style: TextStyle(color: Colors.redAccent)),
                                      ],
                                    ),
                                  ),
                              ],
                            ),
                          ],
                        ),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }
}
