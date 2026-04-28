import 'package:flutter/material.dart';
import 'package:pillsbee/src/features/medicines/models/medicine.dart';

class MedicineInfoScreen extends StatelessWidget {
  final Medicine medicine;
  const MedicineInfoScreen({super.key, required this.medicine});

  @override
  Widget build(BuildContext context) {
    bool needsRefill = medicine.remainingQuantity <= 2;

    return Scaffold(
      appBar: AppBar(title: Text(medicine.name)),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: Theme.of(context).primaryColor.withOpacity(0.1),
                  shape: BoxShape.circle,
                ),
                child: Icon(Icons.medication, size: 80, color: Theme.of(context).primaryColor),
              ),
            ),
            const SizedBox(height: 32),
            Text('Details', style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold)),
            const Divider(),
            _buildDetailRow(context, Icons.info_outline, 'Dosage', medicine.dosage),
            _buildDetailRow(context, Icons.access_time, 'Scheduled Time', medicine.time),
            _buildDetailRow(context, Icons.inventory, 'Stock Status', '${medicine.remainingQuantity} / ${medicine.totalQuantity} remaining'),
            if (needsRefill)
              Container(
                margin: const EdgeInsets.symmetric(vertical: 16),
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.red.shade50,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.red.shade200),
                ),
                child: const Row(
                  children: [
                    Icon(Icons.warning_amber_rounded, color: Colors.red),
                    SizedBox(width: 12),
                    Expanded(child: Text('Low stock! Please refill soon.', style: TextStyle(color: Colors.red, fontWeight: FontWeight.bold))),
                  ],
                ),
              ),
            const SizedBox(height: 32),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                icon: const Icon(Icons.history),
                label: const Text('View Logs'),
                onPressed: () {},
                style: ElevatedButton.styleFrom(
                  backgroundColor: Theme.of(context).primaryColor,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDetailRow(BuildContext context, IconData icon, String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 12.0),
      child: Row(
        children: [
          Icon(icon, color: Colors.grey),
          const SizedBox(width: 16),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label, style: const TextStyle(color: Colors.grey, fontSize: 12)),
              Text(value, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w500)),
            ],
          ),
        ],
      ),
    );
  }
}
