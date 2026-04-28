import 'package:go_router/go_router.dart';
import 'package:pillsbee/src/features/auth/screens/splash_screen.dart';
import 'package:pillsbee/src/features/auth/screens/login_screen.dart';
import 'package:pillsbee/src/features/auth/screens/signup_screen.dart';
import 'package:pillsbee/src/features/dashboard/screens/dashboard_screen.dart';
import 'package:pillsbee/src/features/chatbot/screens/chatbot_screen.dart';
import 'package:pillsbee/src/features/scanner/screens/scanner_screen.dart';
import 'package:pillsbee/src/features/medicines/screens/add_medicine_screen.dart';
import 'package:pillsbee/src/features/medicines/screens/prescription_upload_screen.dart';
import 'package:pillsbee/src/features/medicines/screens/medicine_info_screen.dart';
import 'package:pillsbee/src/features/medicines/models/medicine.dart';
import 'package:pillsbee/src/features/medicines/screens/history_screen.dart';
import 'package:pillsbee/src/features/dashboard/screens/settings_screen.dart';
import 'package:camera/camera.dart';

late List<CameraDescription> appCameras;

final goRouter = GoRouter(
  initialLocation: '/',
  routes: [
    GoRoute(
      path: '/',
      builder: (context, state) => const SplashScreen(),
    ),
    GoRoute(
      path: '/login',
      builder: (context, state) => const LoginScreen(),
    ),
    GoRoute(
      path: '/signup',
      builder: (context, state) => const SignupScreen(),
    ),
    GoRoute(
      path: '/dashboard',
      builder: (context, state) => const DashboardScreen(),
    ),
    GoRoute(
      path: '/chatbot',
      builder: (context, state) => const ChatbotScreen(),
    ),
    GoRoute(
      path: '/scanner',
      builder: (context, state) => ScannerScreen(cameras: appCameras),
    ),
    GoRoute(
      path: '/add_medicine',
      builder: (context, state) => const AddMedicineScreen(),
    ),
    GoRoute(
      path: '/history',
      builder: (context, state) => const HistoryScreen(),
    ),
    GoRoute(
      path: '/settings',
      builder: (context, state) => const SettingsScreen(),
    ),
    GoRoute(
      path: '/medicine_info',
      builder: (context, state) {
        final medicine = state.extra as Medicine;
        return MedicineInfoScreen(medicine: medicine);
      },
    ),
    GoRoute(
      path: '/prescription_upload',
      builder: (context, state) => const PrescriptionUploadScreen(),
    ),
  ],
);
