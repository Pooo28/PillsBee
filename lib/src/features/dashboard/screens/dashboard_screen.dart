import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:pillsbee/src/features/medicines/models/medicine.dart';
import 'package:pillsbee/src/features/medicines/providers/medicine_provider.dart';

import 'package:pillsbee/src/features/medicines/screens/history_screen.dart';
import 'package:pillsbee/src/features/dashboard/screens/settings_screen.dart';

class DashboardScreen extends ConsumerStatefulWidget {
  const DashboardScreen({super.key});

  @override
  ConsumerState<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends ConsumerState<DashboardScreen> {
  int _currentIndex = 0;

  @override
  Widget build(BuildContext context) {
    Widget body;
    switch (_currentIndex) {
      case 0:
        body = _buildHomeTab();
        break;
      case 1:
        body = const HistoryScreen();
        break;
      case 2:
        body = const SettingsScreen();
        break;
      default:
        body = _buildHomeTab();
    }

    return Scaffold(
      appBar: AppBar(
        title: Text(_currentIndex == 0 ? 'Dashboard' : _currentIndex == 1 ? 'History' : 'Settings'),
        actions: [
          IconButton(
            icon: const Icon(Icons.chat), 
            onPressed: () => context.push('/chatbot'),
          ),
          if (_currentIndex == 0)
            IconButton(
              icon: const Icon(Icons.add), 
              onPressed: () => context.push('/add_medicine'),
            ),
        ],
      ),
      body: body,
      floatingActionButton: FloatingActionButton(
        onPressed: () => context.push('/scanner'),
        backgroundColor: Theme.of(context).primaryColor,
        child: const Icon(Icons.camera_alt, color: Colors.white),
      ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex,
        onTap: (index) => setState(() => _currentIndex = index),
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.home), label: 'Home'),
          BottomNavigationBarItem(icon: Icon(Icons.history), label: 'History'),
          BottomNavigationBarItem(icon: Icon(Icons.settings), label: 'Settings'),
        ],
      ),
    );
  }

  Widget _buildHomeTab() {
    final medicines = ref.watch(medicineProvider);
    
    return ListView(
      padding: const EdgeInsets.all(16.0),
      children: [
        Text('Today\'s Schedule', style: Theme.of(context).textTheme.titleLarge),
        const SizedBox(height: 16),
        if (medicines.isEmpty)
          const Padding(
            padding: EdgeInsets.all(24.0),
            child: Center(child: Text('No medicines added yet!')),
          )
        else
          ...medicines.map((med) => _buildMedicineCard(med)),
      ],
    );
  }

  Widget _buildMedicineCard(Medicine medicine) {
    bool needsRefill = medicine.remainingQuantity <= 2;
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: needsRefill ? Colors.redAccent : Theme.of(context).primaryColor,
          child: const Icon(Icons.medication, color: Colors.white),
        ),
        title: Text(medicine.name, style: const TextStyle(fontWeight: FontWeight.bold)),
        subtitle: Text('${medicine.dosage} • ${medicine.time}\nRemaining: ${medicine.remainingQuantity}'),
        isThreeLine: true,
        trailing: IconButton(
          icon: const Icon(Icons.check_circle_outline),
          color: Colors.green,
          onPressed: () {
            ref.read(medicineProvider.notifier).markAsTaken(medicine.id);
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text('Marked ${medicine.name} as taken')),
            );
          },
        ),
      ),
    );
  }
}
