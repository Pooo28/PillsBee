import 'package:camera/camera.dart';
import 'package:flutter/material.dart';
import 'package:pillsbee/src/features/scanner/services/ocr_service.dart';

class ScannerScreen extends StatefulWidget {
  final List<CameraDescription> cameras;
  const ScannerScreen({super.key, required this.cameras});

  @override
  State<ScannerScreen> createState() => _ScannerScreenState();
}

class _ScannerScreenState extends State<ScannerScreen> {
  late CameraController _controller;
  final OcrService _ocrService = OcrService();
  bool _isProcessing = false;
  String _extractedText = '';

  @override
  void initState() {
    super.initState();
    if (widget.cameras.isNotEmpty) {
      _controller = CameraController(widget.cameras[0], ResolutionPreset.high);
      _controller.initialize().then((_) {
        if (!mounted) return;
        setState(() {});
      }).catchError((e) {
        debugPrint('Camera Error: $e');
      });
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    _ocrService.dispose();
    super.dispose();
  }

  void _scanImage() async {
    if (!_controller.value.isInitialized) return;
    if (_isProcessing) return;

    setState(() {
      _isProcessing = true;
      _extractedText = '';
    });

    try {
      final image = await _controller.takePicture();
      final text = await _ocrService.extractTextFromImage(image.path);
      
      setState(() {
        _extractedText = text;
        _isProcessing = false;
      });
      
      _showResultDialog(text);
    } catch (e) {
      setState(() => _isProcessing = false);
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
    }
  }

  void _showResultDialog(String text) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Extracted Text'),
        content: SingleChildScrollView(
          child: Text(text.isEmpty ? 'No text found' : text),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Close'),
          ),
          ElevatedButton(
            onPressed: () {
              // TODO: Parse medicine name and auto-fill Add Medicine Form
              Navigator.pop(context);
            },
            child: const Text('Use Details'),
          )
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (widget.cameras.isEmpty) {
      return Scaffold(
        appBar: AppBar(title: const Text('Scanner')),
        body: const Center(child: Text('No camera available')),
      );
    }

    if (!_controller.value.isInitialized) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    return Scaffold(
      appBar: AppBar(title: const Text('Scan Medicine')),
      body: Stack(
        children: [
          SizedBox.expand(child: CameraPreview(_controller)),
          if (_isProcessing)
            Container(
              color: Colors.black54,
              child: const Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    CircularProgressIndicator(color: Colors.white),
                    SizedBox(height: 16),
                    Text('Analyzing...', style: TextStyle(color: Colors.white)),
                  ],
                ),
              ),
            ),
          Align(
            alignment: Alignment.bottomCenter,
            child: Padding(
              padding: const EdgeInsets.only(bottom: 32.0),
              child: FloatingActionButton.large(
                onPressed: _scanImage,
                backgroundColor: Theme.of(context).primaryColor,
                child: const Icon(Icons.camera_alt, color: Colors.white),
              ),
            ),
          )
        ],
      ),
    );
  }
}
