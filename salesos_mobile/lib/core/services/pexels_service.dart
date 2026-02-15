import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../network/api_client.dart';

/// Pexels API Service - Fetches professional stock images via backend proxy
/// The API key is stored securely on the server
class PexelsService {
  final ApiClient _apiClient;

  PexelsService(this._apiClient);

  /// Search for photos by query
  Future<List<PexelsPhoto>> searchPhotos({
    required String query,
    int perPage = 15,
    int page = 1,
    String? orientation, // landscape, portrait, square
    String? size, // large, medium, small
  }) async {
    try {
      final params = <String, dynamic>{
        'query': query,
        'perPage': perPage,
        'page': page,
        'orientation': ?orientation,
        'size': ?size,
      };

      final response = await _apiClient.get('/images/search', queryParameters: params);

      if (response.statusCode == 200) {
        final data = response.data;
        final photos = (data['photos'] as List<dynamic>?)
            ?.map((p) => PexelsPhoto.fromJson(p as Map<String, dynamic>))
            .toList() ?? [];
        return photos;
      }
      return [];
    } catch (e) {
      return [];
    }
  }

  /// Get curated photos (editor's choice)
  Future<List<PexelsPhoto>> getCuratedPhotos({
    int perPage = 15,
    int page = 1,
  }) async {
    try {
      final response = await _apiClient.get('/images/curated', queryParameters: {
        'perPage': perPage,
        'page': page,
      });

      if (response.statusCode == 200) {
        final data = response.data;
        final photos = (data['photos'] as List<dynamic>?)
            ?.map((p) => PexelsPhoto.fromJson(p as Map<String, dynamic>))
            .toList() ?? [];
        return photos;
      }
      return [];
    } catch (e) {
      return [];
    }
  }

  /// Get a specific photo by ID
  Future<PexelsPhoto?> getPhoto(int id) async {
    try {
      final response = await _apiClient.get('/images/$id');

      if (response.statusCode == 200) {
        return PexelsPhoto.fromJson(response.data as Map<String, dynamic>);
      }
      return null;
    } catch (e) {
      return null;
    }
  }
}

/// Pexels Photo model
class PexelsPhoto {
  final int id;
  final int width;
  final int height;
  final String url;
  final String photographer;
  final String photographerUrl;
  final int photographerId;
  final String avgColor;
  final PexelsPhotoSrc src;
  final String alt;

  PexelsPhoto({
    required this.id,
    required this.width,
    required this.height,
    required this.url,
    required this.photographer,
    required this.photographerUrl,
    required this.photographerId,
    required this.avgColor,
    required this.src,
    required this.alt,
  });

  factory PexelsPhoto.fromJson(Map<String, dynamic> json) {
    return PexelsPhoto(
      id: json['id'] as int? ?? 0,
      width: json['width'] as int? ?? 0,
      height: json['height'] as int? ?? 0,
      url: json['url'] as String? ?? '',
      photographer: json['photographer'] as String? ?? '',
      photographerUrl: json['photographer_url'] as String? ?? '',
      photographerId: json['photographer_id'] as int? ?? 0,
      avgColor: json['avg_color'] as String? ?? '#000000',
      src: PexelsPhotoSrc.fromJson(json['src'] as Map<String, dynamic>? ?? {}),
      alt: json['alt'] as String? ?? '',
    );
  }

  /// Get the best URL for a given width
  String getOptimalUrl(int targetWidth) {
    if (targetWidth <= 280) return src.tiny;
    if (targetWidth <= 350) return src.small;
    if (targetWidth <= 940) return src.medium;
    if (targetWidth <= 1880) return src.large;
    return src.large2x;
  }
}

/// Photo source URLs in various sizes
class PexelsPhotoSrc {
  final String original;
  final String large2x;  // 1880px width
  final String large;    // 940px width
  final String medium;   // 350px height
  final String small;    // 130px height
  final String portrait; // 800x1200
  final String landscape; // 1200x627
  final String tiny;     // 280x200

  PexelsPhotoSrc({
    required this.original,
    required this.large2x,
    required this.large,
    required this.medium,
    required this.small,
    required this.portrait,
    required this.landscape,
    required this.tiny,
  });

  factory PexelsPhotoSrc.fromJson(Map<String, dynamic> json) {
    return PexelsPhotoSrc(
      original: json['original'] as String? ?? '',
      large2x: json['large2x'] as String? ?? '',
      large: json['large'] as String? ?? '',
      medium: json['medium'] as String? ?? '',
      small: json['small'] as String? ?? '',
      portrait: json['portrait'] as String? ?? '',
      landscape: json['landscape'] as String? ?? '',
      tiny: json['tiny'] as String? ?? '',
    );
  }
}

// ============================================================================
// PROVIDERS
// ============================================================================

/// Provider for Pexels service
final pexelsServiceProvider = Provider<PexelsService>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  return PexelsService(apiClient);
});

/// Provider for searching analytics/business images
final analyticsImagesProvider = FutureProvider<List<PexelsPhoto>>((ref) async {
  final service = ref.watch(pexelsServiceProvider);
  return service.searchPhotos(
    query: 'business analytics dashboard',
    perPage: 5,
    orientation: 'landscape',
  );
});

/// Provider for professional business images
final businessImagesProvider = FutureProvider<List<PexelsPhoto>>((ref) async {
  final service = ref.watch(pexelsServiceProvider);
  return service.searchPhotos(
    query: 'professional business meeting',
    perPage: 10,
    orientation: 'landscape',
  );
});

/// Provider for CRM/sales related images
final salesImagesProvider = FutureProvider<List<PexelsPhoto>>((ref) async {
  final service = ref.watch(pexelsServiceProvider);
  return service.searchPhotos(
    query: 'sales team success',
    perPage: 10,
    orientation: 'landscape',
  );
});

/// Provider for technology/AI images
final technologyImagesProvider = FutureProvider<List<PexelsPhoto>>((ref) async {
  final service = ref.watch(pexelsServiceProvider);
  return service.searchPhotos(
    query: 'artificial intelligence technology',
    perPage: 10,
    orientation: 'landscape',
  );
});

/// Parameterized provider for custom image searches
final customImageSearchProvider = FutureProvider.family<List<PexelsPhoto>, String>((ref, query) async {
  final service = ref.watch(pexelsServiceProvider);
  return service.searchPhotos(
    query: query,
    perPage: 10,
    orientation: 'landscape',
  );
});
