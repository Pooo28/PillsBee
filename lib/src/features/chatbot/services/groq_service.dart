import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:pillsbee/src/core/utils/app_secrets.dart';

class GroqService {
  static const String _endpoint = 'https://api.groq.com/openai/v1/chat/completions';

  final List<Map<String, String>> _messages = [
    {
      'role': 'system',
      'content': 'You are PillsBee, a helpful and friendly medical assistant. Always remind the user to "Consult your doctor before taking any medicine." Keep responses concise and easy to understand.'
    }
  ];

  Future<String> sendMessage(String userMessage) async {
    _messages.add({'role': 'user', 'content': userMessage});

    try {
      final response = await http.post(
        Uri.parse(_endpoint),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ${AppSecrets.groqApiKey}',
        },
        body: jsonEncode({
          'model': 'llama3-8b-8192', // Example model, change as needed
          'messages': _messages,
          'temperature': 0.7,
        }),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final botReply = data['choices'][0]['message']['content'] as String;
        
        _messages.add({'role': 'assistant', 'content': botReply});
        return botReply;
      } else {
        return 'Error connecting to AI service. Please try again later.';
      }
    } catch (e) {
      return 'Network error: $e';
    }
  }

  List<Map<String, String>> get chatHistory => _messages.where((m) => m['role'] != 'system').toList();
}
