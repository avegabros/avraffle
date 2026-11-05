import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;

class PublicPrizesScreen extends StatefulWidget {
  final String serverUrl;
  final String location;
  const PublicPrizesScreen({super.key, required this.serverUrl, required this.location});

  @override
  State<PublicPrizesScreen> createState() => _PublicPrizesScreenState();
}

class _PublicPrizesScreenState extends State<PublicPrizesScreen> {
  List<dynamic> _prizes = [];
  bool _isLoading = true;

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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        title: const Text('RAFFLE PRIZES', style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: Colors.transparent,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _fetchPrizes,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: Color(0xFFF59E0B)))
          : _prizes.isEmpty
              ? const Center(
                  child: Text('No prizes listed for this location yet.', style: TextStyle(color: Colors.grey)),
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
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(18),
                        side: BorderSide(
                          color: isGrand ? const Color(0xFFF59E0B).withValues(alpha: 0.5) : Colors.white10,
                          width: isGrand ? 1.5 : 1,
                        ),
                      ),
                      margin: const EdgeInsets.only(bottom: 14),
                      child: Padding(
                        padding: const EdgeInsets.all(12),
                        child: Row(
                          children: [
                            Container(
                              width: 64,
                              height: 64,
                              decoration: BoxDecoration(
                                color: const Color(0xFF0F172A),
                                borderRadius: BorderRadius.circular(14),
                              ),
                              child: imgPath != null
                                  ? ClipRRect(
                                      borderRadius: BorderRadius.circular(14),
                                      child: Image.network(
                                        '${widget.serverUrl}$imgPath',
                                        fit: BoxFit.cover,
                                        errorBuilder: (_, _, _) => const Icon(Icons.card_giftcard, color: Colors.grey),
                                      ),
                                    )
                                  : Icon(
                                      isGrand ? Icons.star : Icons.card_giftcard,
                                      color: isGrand ? const Color(0xFFF59E0B) : Colors.grey,
                                      size: 32,
                                    ),
                            ),
                            const SizedBox(width: 14),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      if (isGrand)
                                        Container(
                                          margin: const EdgeInsets.only(right: 6),
                                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                          decoration: BoxDecoration(
                                            color: const Color(0xFFF59E0B),
                                            borderRadius: BorderRadius.circular(6),
                                          ),
                                          child: const Text(
                                            'GRAND',
                                            style: TextStyle(fontSize: 9, fontWeight: FontWeight.w900, color: Colors.black),
                                          ),
                                        ),
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
                                    ],
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    'Available Quantity: ${p['quantity']}',
                                    style: TextStyle(
                                      fontSize: 12,
                                      color: isGrand ? const Color(0xFFFCD34D) : Colors.grey,
                                    ),
                                  ),
                                  if (p['description'] != null && p['description'].toString().isNotEmpty) ...[
                                    const SizedBox(height: 2),
                                    Text(
                                      p['description'],
                                      maxLines: 2,
                                      overflow: TextOverflow.ellipsis,
                                      style: const TextStyle(fontSize: 11, color: Colors.grey),
                                    ),
                                  ],
                                ],
                              ),
                            ),
                            const SizedBox(width: 8),
                            isWon
                                ? Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                    decoration: BoxDecoration(
                                      color: Colors.redAccent.withValues(alpha: 0.15),
                                      borderRadius: BorderRadius.circular(8),
                                      border: Border.all(color: Colors.redAccent.withValues(alpha: 0.5)),
                                    ),
                                    child: const Text(
                                      'CLAIMED',
                                      style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.redAccent),
                                    ),
                                  )
                                : Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                    decoration: BoxDecoration(
                                      color: Colors.green.withValues(alpha: 0.15),
                                      borderRadius: BorderRadius.circular(8),
                                      border: Border.all(color: Colors.green.withValues(alpha: 0.5)),
                                    ),
                                    child: const Text(
                                      'IN PLAY',
                                      style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.green),
                                    ),
                                  ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
    );
  }
}
