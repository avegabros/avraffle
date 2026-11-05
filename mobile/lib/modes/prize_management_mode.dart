import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:http/http.dart' as http;

class PrizeManagementScreen extends StatefulWidget {
  final String serverUrl;
  final String location;
  const PrizeManagementScreen({super.key, required this.serverUrl, this.location = 'TAYUD'});

  @override
  State<PrizeManagementScreen> createState() => _PrizeManagementScreenState();
}

class _PrizeManagementScreenState extends State<PrizeManagementScreen> {
  List<dynamic> _prizes = [];
  bool _isLoading = false;
  final _picker = ImagePicker();

  @override
  void initState() {
    super.initState();
    _fetchPrizes();
  }

  Future<void> _fetchPrizes() async {
    setState(() => _isLoading = true);
    try {
      final locParam = widget.location != 'ALL' ? '?location=${widget.location}' : '';
      final res = await http.get(Uri.parse('${widget.serverUrl}/api/prizes$locParam'));
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        setState(() {
          _prizes = data['prizes'] ?? [];
        });
      }
    } catch (_) {}
    setState(() => _isLoading = false);
  }

  // Add or Edit dialog
  void _showPrizeFormDialog({Map<String, dynamic>? prize}) {
    final isEditing = prize != null;
    final nameController = TextEditingController(text: isEditing ? (prize['name'] ?? '') : '');
    final descController = TextEditingController(text: isEditing ? (prize['description'] ?? '') : '');
    final qtyController = TextEditingController(text: isEditing ? (prize['quantity']?.toString() ?? '1') : '1');
    bool isGrand = isEditing ? (prize['isGrandPrize'] == true) : false;
    bool isWon = isEditing ? (prize['isWon'] == true) : false;
    String location = isEditing ? (prize['location'] ?? widget.location) : (widget.location == 'ALL' ? 'TAYUD' : widget.location);
    String? existingImagePath = isEditing ? prize['imagePath'] : null;
    XFile? selectedImage;

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
            left: 20,
            right: 20,
            top: 24,
            bottom: MediaQuery.of(ctx).viewInsets.bottom + 24,
          ),
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      isEditing ? 'Edit Prize Entry' : 'Add New Raffle Prize',
                      style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                    ),
                    if (isEditing)
                      IconButton(
                        icon: const Icon(Icons.delete_outline, color: Colors.redAccent),
                        onPressed: () => _confirmDeletePrize(ctx, prize['id']),
                        tooltip: 'Delete Prize',
                      ),
                  ],
                ),
                const SizedBox(height: 16),

                // Photo preview & capture button
                GestureDetector(
                  onTap: () async {
                    final source = await showDialog<ImageSource>(
                      context: ctx,
                      builder: (c) => AlertDialog(
                        title: const Text('Prize Photo Source'),
                        actions: [
                          TextButton(
                            onPressed: () => Navigator.pop(c, ImageSource.camera),
                            child: const Text('Camera'),
                          ),
                          TextButton(
                            onPressed: () => Navigator.pop(c, ImageSource.gallery),
                            child: const Text('Gallery'),
                          ),
                        ],
                      ),
                    );

                    if (source != null) {
                      final picked = await _picker.pickImage(
                        source: source,
                        maxWidth: 1080,
                        maxHeight: 1080,
                        imageQuality: 85,
                      );
                      if (picked != null) {
                        setModalState(() => selectedImage = picked);
                      }
                    }
                  },
                  child: Container(
                    height: 160,
                    decoration: BoxDecoration(
                      color: const Color(0xFF0F172A),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: Colors.white24, style: BorderStyle.solid),
                    ),
                    child: selectedImage != null
                        ? ClipRRect(
                            borderRadius: BorderRadius.circular(16),
                            child: Image.file(
                              File(selectedImage!.path),
                              fit: BoxFit.cover,
                            ),
                          )
                        : existingImagePath != null
                            ? ClipRRect(
                                borderRadius: BorderRadius.circular(16),
                                child: Stack(
                                  fit: StackFit.expand,
                                  children: [
                                    Image.network(
                                      '${widget.serverUrl}$existingImagePath',
                                      fit: BoxFit.cover,
                                    ),
                                    Container(
                                      color: Colors.black38,
                                      alignment: Alignment.center,
                                      child: const Text(
                                        'Tap to Replace Photo',
                                        style: TextStyle(fontWeight: FontWeight.bold),
                                      ),
                                    ),
                                  ],
                                ),
                              )
                            : const Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Icon(Icons.add_a_photo, size: 40, color: Color(0xFFF59E0B)),
                                  SizedBox(height: 8),
                                  Text('Snap or Upload Prize Photo', style: TextStyle(color: Colors.grey)),
                                ],
                              ),
                  ),
                ),
                const SizedBox(height: 16),

                TextField(
                  controller: nameController,
                  decoration: const InputDecoration(
                    labelText: 'Prize Name (e.g. Smart 4K TV 55")',
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 12),

                TextField(
                  controller: descController,
                  decoration: const InputDecoration(
                    labelText: 'Description / Model (optional)',
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 12),

                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: qtyController,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(
                          labelText: 'Quantity',
                          border: OutlineInputBorder(),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: DropdownButtonFormField<String>(
                        initialValue: ['TAYUD', 'MAKATI', 'ALL'].contains(location) ? location : 'TAYUD',
                        decoration: const InputDecoration(
                          labelText: 'Venue Scope',
                          border: OutlineInputBorder(),
                        ),
                        items: const [
                          DropdownMenuItem(value: 'TAYUD', child: Text('Tayud')),
                          DropdownMenuItem(value: 'MAKATI', child: Text('Makati')),
                          DropdownMenuItem(value: 'ALL', child: Text('All Offices')),
                        ],
                        onChanged: (val) => setModalState(() => location = val ?? 'TAYUD'),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),

                Row(
                  children: [
                    Expanded(
                      child: CheckboxListTile(
                        contentPadding: EdgeInsets.zero,
                        title: const Text('Grand Prize', style: TextStyle(fontSize: 14)),
                        value: isGrand,
                        activeColor: const Color(0xFFF59E0B),
                        onChanged: (val) => setModalState(() => isGrand = val ?? false),
                      ),
                    ),
                    if (isEditing)
                      Expanded(
                        child: CheckboxListTile(
                          contentPadding: EdgeInsets.zero,
                          title: const Text('Mark Won', style: TextStyle(fontSize: 14)),
                          value: isWon,
                          activeColor: Colors.redAccent,
                          onChanged: (val) => setModalState(() => isWon = val ?? false),
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: 20),

                ElevatedButton.icon(
                  icon: Icon(isEditing ? Icons.save : Icons.cloud_upload),
                  label: Padding(
                    padding: const EdgeInsets.symmetric(vertical: 14.0),
                    child: Text(
                      isEditing ? 'SAVE CHANGES' : 'CREATE & UPLOAD PRIZE',
                      style: const TextStyle(fontWeight: FontWeight.bold),
                    ),
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF10B981),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  ),
                  onPressed: () async {
                    final name = nameController.text.trim();
                    if (name.isEmpty) return;

                    final method = isEditing ? 'PUT' : 'POST';
                    final req = http.MultipartRequest(
                      method,
                      Uri.parse('${widget.serverUrl}/api/prizes'),
                    );

                    if (isEditing) {
                      req.fields['id'] = prize['id'].toString();
                      req.fields['isWon'] = isWon.toString();
                    }
                    req.fields['name'] = name;
                    req.fields['description'] = descController.text.trim();
                    req.fields['quantity'] = qtyController.text.trim();
                    req.fields['isGrandPrize'] = isGrand.toString();
                    req.fields['location'] = location;

                    if (selectedImage != null) {
                      req.files.add(await http.MultipartFile.fromPath('photo', selectedImage!.path));
                    }

                    final res = await req.send();
                    if (res.statusCode == 200) {
                      if (ctx.mounted) Navigator.pop(ctx);
                      _fetchPrizes();
                    }
                  },
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  void _confirmDeletePrize(BuildContext sheetContext, dynamic id) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete Prize?'),
        content: const Text('Are you sure you want to permanently remove this prize?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.redAccent),
            onPressed: () async {
              Navigator.pop(ctx); // Close confirmation
              try {
                final res = await http.delete(
                  Uri.parse('${widget.serverUrl}/api/prizes'),
                  headers: {'Content-Type': 'application/json'},
                  body: jsonEncode({'id': id}),
                );
                if (res.statusCode == 200) {
                  if (sheetContext.mounted) Navigator.pop(sheetContext); // Close bottom sheet
                  _fetchPrizes();
                }
              } catch (_) {}
            },
            child: const Text('Delete'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('PRIZES TEAM (${widget.location})'),
        backgroundColor: Colors.transparent,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _fetchPrizes,
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: const Color(0xFFF59E0B),
        icon: const Icon(Icons.add, color: Colors.black),
        label: const Text('ADD PRIZE', style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold)),
        onPressed: () => _showPrizeFormDialog(),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _prizes.isEmpty
              ? const Center(
                  child: Text('No prizes added yet. Tap "+ ADD PRIZE" to create one.'),
                )
              : ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: _prizes.length,
                  itemBuilder: (ctx, idx) {
                    final p = _prizes[idx];
                    final isWon = p['isWon'] == true;
                    final isGrand = p['isGrandPrize'] == true;
                    final imgPath = p['imagePath'];

                    return Card(
                      color: const Color(0xFF1E293B),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                      margin: const EdgeInsets.only(bottom: 12),
                      child: InkWell(
                        borderRadius: BorderRadius.circular(16),
                        onTap: () => _showPrizeFormDialog(prize: p),
                        child: Padding(
                          padding: const EdgeInsets.all(12),
                          child: Row(
                            children: [
                              // Photo preview thumbnail
                              Container(
                                width: 56,
                                height: 56,
                                decoration: BoxDecoration(
                                  color: const Color(0xFF0F172A),
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: imgPath != null
                                    ? ClipRRect(
                                        borderRadius: BorderRadius.circular(12),
                                        child: Image.network(
                                          '${widget.serverUrl}$imgPath',
                                          fit: BoxFit.cover,
                                          errorBuilder: (_, _, _) => const Icon(Icons.card_giftcard),
                                        ),
                                      )
                                    : Icon(
                                        isGrand ? Icons.star : Icons.card_giftcard,
                                        color: isGrand ? Colors.amber : Colors.grey,
                                      ),
                              ),
                              const SizedBox(width: 14),

                              // Info
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      children: [
                                        Expanded(
                                          child: Text(
                                            p['name'],
                                            style: TextStyle(
                                              fontWeight: FontWeight.bold,
                                              fontSize: 16,
                                              decoration: isWon ? TextDecoration.lineThrough : null,
                                              color: isWon ? Colors.grey : Colors.white,
                                            ),
                                          ),
                                        ),
                                        if (p['location'] != null && p['location'] != 'ALL')
                                          Container(
                                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                            decoration: BoxDecoration(
                                              color: Colors.blueGrey.shade800,
                                              borderRadius: BorderRadius.circular(6),
                                            ),
                                            child: Text(
                                              p['location'],
                                              style: const TextStyle(fontSize: 9, fontWeight: FontWeight.bold),
                                            ),
                                          ),
                                      ],
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      isGrand
                                          ? '🌟 Grand Prize • Qty: ${p['quantity']}'
                                          : 'Regular Prize • Qty: ${p['quantity']}',
                                      style: TextStyle(
                                        fontSize: 13,
                                        color: isGrand ? Colors.amber.shade300 : Colors.grey,
                                      ),
                                    ),
                                    if (p['description'] != null && p['description'].toString().isNotEmpty) ...[
                                      const SizedBox(height: 2),
                                      Text(
                                        p['description'],
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style: const TextStyle(fontSize: 11, color: Colors.grey),
                                      ),
                                    ],
                                  ],
                                ),
                              ),

                              const SizedBox(width: 8),

                              // Action / Status Pill & Edit Icon
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.end,
                                children: [
                                  isWon
                                      ? Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                          decoration: BoxDecoration(
                                            color: Colors.redAccent.withValues(alpha: 0.2),
                                            borderRadius: BorderRadius.circular(8),
                                            border: Border.all(color: Colors.redAccent, width: 1),
                                          ),
                                          child: const Text(
                                            'WON',
                                            style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.redAccent),
                                          ),
                                        )
                                      : Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                          decoration: BoxDecoration(
                                            color: Colors.green.withValues(alpha: 0.2),
                                            borderRadius: BorderRadius.circular(8),
                                            border: Border.all(color: Colors.green, width: 1),
                                          ),
                                          child: const Text(
                                            'AVAILABLE',
                                            style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.green),
                                          ),
                                        ),
                                  const SizedBox(height: 6),
                                  const Icon(Icons.edit_note, size: 22, color: Color(0xFFF59E0B)),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ),
                    );
                  },
                ),
    );
  }
}
