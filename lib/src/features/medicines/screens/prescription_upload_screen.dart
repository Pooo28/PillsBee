import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class PrescriptionUploadScreen extends StatefulWidget {
  const PrescriptionUploadScreen({super.key});

  @override
  State<PrescriptionUploadScreen> createState() => _PrescriptionUploadScreenState();
}

class _PrescriptionUploadScreenState extends State<PrescriptionUploadScreen> {
  final ImagePicker _picker = ImagePicker();
  File? _imageFile;
  bool _isUploading = false;

  Future<void> _pickImage() async {
    final XFile? image = await _picker.pickImage(source: ImageSource.gallery);
    if (image != null) {
      setState(() {
        _imageFile = File(image.path);
      });
    }
  }

  Future<void> _uploadPrescription() async {
    if (_imageFile == null) return;
    setState(() => _isUploading = true);

    try {
      final userId = Supabase.instance.client.auth.currentUser?.id;
      if (userId == null) throw Exception('User not logged in');

      final fileName = '${DateTime.now().millisecondsSinceEpoch}.png';
      final storagePath = '$userId/$fileName';

      // Upload to Supabase Storage (assuming a bucket named 'prescriptions')
      await Supabase.instance.client.storage
          .from('prescriptions')
          .upload(storagePath, _imageFile!);

      // Get public URL
      final publicUrl = Supabase.instance.client.storage
          .from('prescriptions')
          .getPublicUrl(storagePath);

      // Save record in database
      await Supabase.instance.client.from('prescriptions').insert({
        'user_id': userId,
        'image_url': publicUrl,
        'created_at': DateTime.now().toIso8601String(),
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Uploaded successfully!')));
        Navigator.pop(context);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Upload failed: $e')));
      }
    } finally {
      if (mounted) setState(() => _isUploading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Upload Prescription')),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            if (_imageFile != null)
              Image.file(_imageFile!, height: 300)
            else
              const Icon(Icons.image, size: 100, color: Colors.grey),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              icon: const Icon(Icons.photo_library),
              label: const Text('Select Image'),
              onPressed: _isUploading ? null : _pickImage,
            ),
            const SizedBox(height: 16),
            if (_imageFile != null)
              ElevatedButton.icon(
                icon: _isUploading ? const CircularProgressIndicator(color: Colors.white) : const Icon(Icons.upload),
                label: Text(_isUploading ? 'Uploading...' : 'Upload Prescription'),
                onPressed: _isUploading ? null : _uploadPrescription,
                style: ElevatedButton.styleFrom(backgroundColor: Colors.green),
              )
          ],
        ),
      ),
    );
  }
}
