import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:pillsbee/src/features/medicines/models/medicine.dart';

class MedicineNotifier extends StateNotifier<List<Medicine>> {
  MedicineNotifier() : super([
    Medicine(id: '1', name: 'Paracetamol', dosage: '500mg', time: '08:00 AM', totalQuantity: 10, remainingQuantity: 8),
    Medicine(id: '2', name: 'Vitamin C', dosage: '1000mg', time: '09:00 AM', totalQuantity: 30, remainingQuantity: 2),
  ]);

  void addMedicine(Medicine medicine) {
    state = [...state, medicine];
  }

  void removeMedicine(String id) {
    state = state.where((m) => m.id != id).toList();
  }

  void markAsTaken(String id) {
    state = [
      for (final m in state)
        if (m.id == id && m.remainingQuantity > 0)
          Medicine(
            id: m.id,
            name: m.name,
            dosage: m.dosage,
            time: m.time,
            totalQuantity: m.totalQuantity,
            remainingQuantity: m.remainingQuantity - 1,
          )
        else
          m
    ];
  }
}

final medicineProvider = StateNotifierProvider<MedicineNotifier, List<Medicine>>((ref) {
  return MedicineNotifier();
});
