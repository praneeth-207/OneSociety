import 'package:flutter_riverpod/flutter_riverpod.dart';

enum AppLanguage { english, hindi, telugu }

class AppStrings {
  static const Map<String, Map<AppLanguage, String>> _localizedValues = {
    'app_name': {
      AppLanguage.english: 'OneSociety',
      AppLanguage.hindi: 'वनसोसायटी',
      AppLanguage.telugu: 'వన్ సొసైటీ',
    },
    'app_tagline': {
      AppLanguage.english: 'One Website for Every Apartment Need',
      AppLanguage.hindi: 'अपार्टमेंट की हर जरूरत के लिए एक मंच',
      AppLanguage.telugu: 'ప్రతి అపార్ట్మెంట్ అవసరానికి ఒకే వేదిక',
    },
    // Navigation & Modules
    'nav_home': {
      AppLanguage.english: 'Home',
      AppLanguage.hindi: 'होम',
      AppLanguage.telugu: 'హోమ్',
    },
    'nav_complaints': {
      AppLanguage.english: 'Smart Complaints',
      AppLanguage.hindi: 'स्मार्ट शिकायतें',
      AppLanguage.telugu: 'స్మార్ట్ ఫిర్యాదులు',
    },
    'nav_society_help': {
      AppLanguage.english: 'Society Help & Visitors',
      AppLanguage.hindi: 'सोसायटी हेल्प व आगंतुक',
      AppLanguage.telugu: 'సొసైటీ హెల్ప్ & సందర్శకులు',
    },
    'nav_service_hub': {
      AppLanguage.english: 'Service Hub',
      AppLanguage.hindi: 'सर्विस हब',
      AppLanguage.telugu: 'సర్వీస్ హబ్',
    },
    'nav_share_rent': {
      AppLanguage.english: 'Share & Rent',
      AppLanguage.hindi: 'शेयर व रेंट',
      AppLanguage.telugu: 'షేర్ & రెంట్',
    },
    'nav_group_buying': {
      AppLanguage.english: 'Group Buying',
      AppLanguage.hindi: 'ग्रुप बाइंग',
      AppLanguage.telugu: 'గ్రూప్ బయింగ్',
    },
    // Common Actions
    'login': {
      AppLanguage.english: 'Sign In',
      AppLanguage.hindi: 'लॉग इन करें',
      AppLanguage.telugu: 'లాగిన్ అవ్వండి',
    },
    'logout': {
      AppLanguage.english: 'Logout',
      AppLanguage.hindi: 'लॉग आउट',
      AppLanguage.telugu: 'లాగ్ అవుట్',
    },
    'email': {
      AppLanguage.english: 'Email Address',
      AppLanguage.hindi: 'ईमेल पता',
      AppLanguage.telugu: 'ఇమెయిల్ చిరునామా',
    },
    'password': {
      AppLanguage.english: 'Password',
      AppLanguage.hindi: 'पासवर्ड',
      AppLanguage.telugu: 'పాస్‌వర్డ్',
    },
    'change_password': {
      AppLanguage.english: 'Change Password',
      AppLanguage.hindi: 'पासवर्ड बदलें',
      AppLanguage.telugu: 'పాస్‌వర్డ్ మార్చండి',
    },
    'must_change_password_notice': {
      AppLanguage.english: 'Please set a new permanent password on your first login.',
      AppLanguage.hindi: 'कृपया पहले लॉगिन पर अपना स्थायी पासवर्ड सेट करें।',
      AppLanguage.telugu: 'దయచేసి మొదటి లాగిన్‌లో కొత్త శాశ్వత పాస్‌వర్డ్‌ను సెట్ చేయండి.',
    },
    'simulated': {
      AppLanguage.english: 'SIMULATED',
      AppLanguage.hindi: 'सिम्युलेटेड (प्रदर्शन)',
      AppLanguage.telugu: 'సిమ్యులేటెడ్ (డెమో)',
    },
    'notifications': {
      AppLanguage.english: 'Notifications',
      AppLanguage.hindi: 'सूचनाएं',
      AppLanguage.telugu: 'నోటిఫికేషన్లు',
    },
    'society': {
      AppLanguage.english: 'Society',
      AppLanguage.hindi: 'सोसायटी',
      AppLanguage.telugu: 'సొసైటీ',
    },
    'flat': {
      AppLanguage.english: 'Flat',
      AppLanguage.hindi: 'फ्लैट',
      AppLanguage.telugu: 'ఫ్లాట్',
    },
    'role': {
      AppLanguage.english: 'Role',
      AppLanguage.hindi: 'भूमिका',
      AppLanguage.telugu: 'పాత్ర',
    },
  };

  static String get(String key, AppLanguage lang) {
    if (_localizedValues.containsKey(key)) {
      return _localizedValues[key]![lang] ?? _localizedValues[key]![AppLanguage.english] ?? key;
    }
    return key;
  }
}

class LanguageNotifier extends StateNotifier<AppLanguage> {
  LanguageNotifier() : super(AppLanguage.english);

  void setLanguage(AppLanguage language) {
    state = language;
  }
}

final languageProvider = StateNotifierProvider<LanguageNotifier, AppLanguage>((ref) {
  return LanguageNotifier();
});
