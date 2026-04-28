import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:pillsbee/src/features/medicines/models/medicine.dart';
import 'package:pillsbee/src/core/utils/notification_service.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:pillsbee/src/features/medicines/providers/medicine_provider.dart';

class AddMedicineScreen extends ConsumerStatefulWidget {
  final Medicine? initialMedicine;
  const AddMedicineScreen({super.key, this.initialMedicine});

  @override
  ConsumerState<AddMedicineScreen> createState() => _AddMedicineScreenState();
}

class _AddMedicineScreenState extends ConsumerState<AddMedicineScreen> {
  final _formKey = GlobalKey<FormState>();
  late TextEditingController _nameController;
  late TextEditingController _dosageController;
  late TextEditingController _quantityController;
  TimeOfDay _selectedTime = TimeOfDay.now();
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _nameController = TextEditingController(text: widget.initialMedicine?.name ?? '');
    _dosageController = TextEditingController(text: widget.initialMedicine?.dosage ?? '');
    _quantityController = TextEditingController(text: widget.initialMedicine?.totalQuantity.toString() ?? '');
  }

  void _pickTime() async {
    final time = await showTimePicker(context: context, initialTime: _selectedTime);
    if (time != null) {
      setState(() => _selectedTime = time);
    }
  }

  void _saveMedicine() async {
    if (_formKey.currentState!.validate()) {
      setState(() => _isLoading = true);
      try {
        final newMedicine = Medicine(
          id: DateTime.now().millisecondsSinceEpoch.toString(),
          name: _nameController.text,
          dosage: _dosageController.text,
          time: _selectedTime.format(context),
          totalQuantity: int.parse(_quantityController.text),
          remainingQuantity: int.parse(_quantityController.text),
        );

        try {
          final userId = Supabase.instance.client.auth.currentUser?.id;
          if (userId != null) {
            final medicineData = {
              'user_id': userId,
              'name': newMedicine.name,
              'dosage': newMedicine.dosage,
              'time': newMedicine.time,
              'total_quantity': newMedicine.totalQuantity,
              'remaining_quantity': newMedicine.remainingQuantity,
            };
            await Supabase.instance.client.from('medicines').insert(medicineData);
          }
        } catch (e) {
          debugPrint('Supabase sync error: $e');
        }

        // Add to local state
        ref.read(medicineProvider.notifier).addMedicine(newMedicine);
        
        // Schedule local notification
        final now = DateTime.now();
        final timeParts = _selectedTime.format(context).split(' ');
        ref.read(notificationServiceProvider).scheduleMedicineReminder(newMedicine, now);
        
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Medicine Saved!')));
          Navigator.pop(context);
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
        }
      } finally {
        if (mounted) setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Add Medicine')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Form(
          key: _formKey,
          child: Column(
            children: [
              TextFormField(
                controller: _nameController,
                decoration: InputDecoration(
                  labelText: 'Medicine Name',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                ),
                validator: (v) => v!.isEmpty ? 'Required' : null,
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _dosageController,
                decoration: InputDecoration(
                  labelText: 'Dosage (e.g., 500mg)',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                ),
                validator: (v) => v!.isEmpty ? 'Required' : null,
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _quantityController,
                keyboardType: TextInputType.number,
                decoration: InputDecoration(
                  labelText: 'Total Quantity',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                ),
                validator: (v) => v!.isEmpty ? 'Required' : null,
              ),
              const SizedBox(height: 16),
              ListTile(
                title: const Text('Time to take'),
                subtitle: Text(_selectedTime.format(context)),
                trailing: const Icon(Icons.access_time),
                onTap: _pickTime,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                  side: BorderSide(color: Colors.grey.shade400),
                ),
              ),
              const SizedBox(height: 32),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _saveMedicine,
                  child: const Text('Save & Schedule'),
                ),
              )
            ],
          ),
        ),
      ),
    );
  }
}
