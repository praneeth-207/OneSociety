import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../auth/auth_provider.dart';
import '../auth/login_page.dart';
import '../auth/change_password_page.dart';
import '../widgets/home_dashboard.dart';
import '../widgets/responsive_scaffold.dart';
import '../../modules/complaints/views/complaints_list_page.dart';
import '../../modules/complaints/views/complaint_detail_page.dart';
import '../../modules/society_help/views/society_help_main_page.dart';
import '../../modules/service_hub/views/service_hub_page.dart';
import '../../modules/share_rent/views/share_rent_page.dart';
import '../../modules/group_buying/views/group_buying_page.dart';

final routerProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authProvider);

  return GoRouter(
    initialLocation: '/',
    redirect: (context, state) {
      final isLoggingIn = state.matchedLocation == '/login';
      final isChangingPassword = state.matchedLocation == '/change-password';

      if (!authState.isAuthenticated) {
        return isLoggingIn ? null : '/login';
      }

      if (authState.mustChangePassword) {
        return isChangingPassword ? null : '/change-password';
      }

      if (isLoggingIn || isChangingPassword) {
        return '/';
      }

      return null;
    },
    routes: [
      GoRoute(
        path: '/login',
        builder: (context, state) => const LoginPage(),
      ),
      GoRoute(
        path: '/change-password',
        builder: (context, state) => const ChangePasswordPage(),
      ),
      ShellRoute(
        builder: (context, state, child) {
          return ResponsiveScaffold(
            currentRoute: state.matchedLocation,
            body: child,
          );
        },
        routes: [
          GoRoute(
            path: '/',
            builder: (context, state) => const HomeDashboard(),
          ),
          GoRoute(
            path: '/complaints',
            builder: (context, state) => const ComplaintsListPage(),
            routes: [
              GoRoute(
                path: ':id',
                builder: (context, state) => ComplaintDetailPage(
                  complaintId: state.pathParameters['id']!,
                ),
              ),
            ],
          ),
          GoRoute(
            path: '/society-help',
            builder: (context, state) => const SocietyHelpMainPage(),
          ),
          GoRoute(
            path: '/service-hub',
            builder: (context, state) => const ServiceHubPage(),
          ),
          GoRoute(
            path: '/share-rent',
            builder: (context, state) => const ShareRentPage(),
          ),
          GoRoute(
            path: '/group-buying',
            builder: (context, state) => const GroupBuyingPage(),
          ),
        ],
      ),
    ],
  );
});
