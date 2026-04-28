import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:flutter_tts/flutter_tts.dart';
import 'package:pillsbee/src/features/medicines/models/medicine.dart';

class NotificationService {
  final FlutterLocalNotificationsPlugin _flutterLocalNotificationsPlugin = FlutterLocalNotificationsPlugin();
  final FlutterTts _flutterTts = FlutterTts();

  Future<void> init() async {
    const AndroidInitializationSettings initializationSettingsAndroid = AndroidInitializationSettings('@mipmap/ic_launcher');
    const DarwinInitializationSettings initializationSettingsIOS = DarwinInitializationSettings();
    const InitializationSettings initializationSettings = InitializationSettings(
      android: initializationSettingsAndroid,
      iOS: initializationSettingsIOS,
    );

    await _flutterLocalNotificationsPlugin.initialize(
      initializationSettings,
      onDidReceiveNotificationResponse: (NotificationResponse response) async {
        if (response.payload != null) {
          _speakReminder(response.payload!);
        }
      },
    );
  }

  Future<void> scheduleMedicineReminder(Medicine medicine, DateTime time) async {
    const AndroidNotificationDetails androidPlatformChannelSpecifics = AndroidNotificationDetails(
      'pillsbee_reminders', 'Medicine Reminders',
      channelDescription: 'Notifications for taking medicines',
      importance: Importance.max,
      priority: Priority.high,
    );
    const NotificationDetails platformChannelSpecifics = NotificationDetails(android: androidPlatformChannelSpecifics);

    await _flutterLocalNotificationsPlugin.show(
      medicine.id.hashCode,
      'Time to take ${medicine.name}',
      'Dosage: ${medicine.dosage}',
      platformChannelSpecifics,
      payload: '${medicine.name}|${medicine.dosage}',
    );
    // Note: For actual scheduling in the future, we would use zonedSchedule.
    // Using show() here for demonstration/mock.
  }

  Future<void> _speakReminder(String payload) async {
    final parts = payload.split('|');
    if (parts.length == 2) {
      final name = parts[0];
      final dosage = parts[1];
      await _flutterTts.speak('Hello! It is time to take $name, $dosage.');
    }
  }

  Future<void> triggerLowStockAlert(Medicine medicine) async {
    const AndroidNotificationDetails androidPlatformChannelSpecifics = AndroidNotificationDetails(
      'pillsbee_alerts', 'Refill Alerts',
      channelDescription: 'Notifications for medicine refills',
      importance: Importance.high,
      priority: Priority.high,
    );
    const NotificationDetails platformChannelSpecifics = NotificationDetails(android: androidPlatformChannelSpecifics);

    await _flutterLocalNotificationsPlugin.show(
      medicine.id.hashCode + 1000, // Offset to avoid conflict
      'Low Stock Alert: ${medicine.name}',
      'Your stock is running low (${medicine.remainingQuantity} left). Time to refill!',
      platformChannelSpecifics,
    );
  }
}
