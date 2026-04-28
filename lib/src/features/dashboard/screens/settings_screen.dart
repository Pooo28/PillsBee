import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:pillsbee/src/core/theme/theme_provider.dart';

class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final themeMode = ref.watch(themeModeProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Settings')),
      body: ListView(
        children: [
          SwitchListTile(
            title: const Text('Dark Mode'),
            subtitle: const Text('Toggle between light and dark theme'),
            value: themeMode == ThemeMode.dark,
            onChanged: (val) {
              ref.read(themeModeProvider.notifier).state = val ? ThemeMode.dark : ThemeMode.light;
            },
            secondary: const Icon(Icons.dark_mode),
          ),
          const Divider(),
          ListTile(
            title: const Text('Voice Alerts'),
            subtitle: const Text('Enable/Disable text-to-speech reminders'),
            trailing: Switch(
              value: true, // Placeholder for actual preference
              onChanged: (val) {},
            ),
            leading: const Icon(Icons.record_voice_over),
          ),
          const Divider(),
          ListTile(
            title: const Text('Language'),
            subtitle: const Text('English (Default)'),
            leading: const Icon(Icons.language),
            onTap: () {},
          ),
          const Divider(),
          ListTile(
            title: const Text('About PillsBee'),
            leading: const Icon(Icons.info_outline),
            onTap: () {
              showAboutDialog(
                context: context,
                applicationName: 'PillsBee',
                applicationVersion: '1.0.0',
                applicationIcon: const Icon(Icons.handholding_medical),
                children: [
                  const Text('Buzzing reminders for your better health.'),
                ],
              );
            },
          ),
        ],
      ),
    );
  }
}
