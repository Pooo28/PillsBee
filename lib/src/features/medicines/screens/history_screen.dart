import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:pillsbee/src/features/medicines/providers/medicine_provider.dart';
import 'package:intl/intl.dart';

class HistoryScreen extends ConsumerWidget {
  const HistoryScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final medicines = ref.watch(medicineProvider);
    
    return Scaffold(
      appBar: AppBar(title: const Text('History Tracking')),
      body: medicines.isEmpty 
        ? const Center(child: Text('No medication history found.'))
        : ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: medicines.length,
            itemBuilder: (context, index) {
              final med = medicines[index];
              return Card(
                child: ListTile(
                  leading: CircleAvatar(
                    backgroundColor: Theme.of(context).primaryColor.withOpacity(0.1),
                    child: Icon(Icons.history, color: Theme.of(context).primaryColor),
                  ),
                  title: Text(med.name, style: const TextStyle(fontWeight: FontWeight.bold)),
                  subtitle: Text('Last taken: ${med.remainingQuantity < med.totalQuantity ? "Recently" : "Not yet recorded"}'),
                  trailing: Text('${med.remainingQuantity}/${med.totalQuantity} left'),
                ),
              );
            },
          ),
    );
  }
}
