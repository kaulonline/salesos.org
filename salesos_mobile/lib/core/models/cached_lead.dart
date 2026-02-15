import 'package:hive/hive.dart';

part 'cached_lead.g.dart';

/// Hive adapter for caching Lead entities
///
/// This model stores leads locally for offline access and caching.
/// Registered as typeId 1 in Hive.
@HiveType(typeId: 1)
class CachedLead extends HiveObject {
  @HiveField(0)
  final String id;

  @HiveField(1)
  final String? firstName;

  @HiveField(2)
  final String? lastName;

  @HiveField(3)
  final String? company;

  @HiveField(4)
  final String? title;

  @HiveField(5)
  final String? email;

  @HiveField(6)
  final String? phone;

  @HiveField(7)
  final String? mobilePhone;

  @HiveField(8)
  final String? status;

  @HiveField(9)
  final String? rating;

  @HiveField(10)
  final String? industry;

  @HiveField(11)
  final String? leadSource;

  @HiveField(12)
  final String? description;

  @HiveField(13)
  final String? street;

  @HiveField(14)
  final String? city;

  @HiveField(15)
  final String? state;

  @HiveField(16)
  final String? postalCode;

  @HiveField(17)
  final int? numberOfEmployees;

  @HiveField(18)
  final double? annualRevenue;

  @HiveField(19)
  final String? website;

  @HiveField(20)
  final DateTime? createdAt;

  @HiveField(21)
  final DateTime? updatedAt;

  @HiveField(22)
  final DateTime cachedAt;

  CachedLead({
    required this.id,
    this.firstName,
    this.lastName,
    this.company,
    this.title,
    this.email,
    this.phone,
    this.mobilePhone,
    this.status,
    this.rating,
    this.industry,
    this.leadSource,
    this.description,
    this.street,
    this.city,
    this.state,
    this.postalCode,
    this.numberOfEmployees,
    this.annualRevenue,
    this.website,
    this.createdAt,
    this.updatedAt,
    DateTime? cachedAt,
  }) : cachedAt = cachedAt ?? DateTime.now();

  /// Full name of the lead
  String get fullName {
    final parts = [firstName, lastName].whereType<String>().toList();
    return parts.isEmpty ? 'Unknown' : parts.join(' ');
  }

  /// Create from API response map (Salesforce or Local API format)
  factory CachedLead.fromMap(Map<String, dynamic> map) {
    return CachedLead(
      id: map['Id'] as String? ?? map['id'] as String? ?? '',
      firstName: map['FirstName'] as String? ?? map['firstName'] as String?,
      lastName: map['LastName'] as String? ?? map['lastName'] as String?,
      company: map['Company'] as String? ?? map['company'] as String?,
      title: map['Title'] as String? ?? map['title'] as String?,
      email: map['Email'] as String? ?? map['email'] as String?,
      phone: map['Phone'] as String? ?? map['phone'] as String?,
      mobilePhone: map['MobilePhone'] as String? ?? map['mobilePhone'] as String?,
      status: map['Status'] as String? ?? map['status'] as String?,
      rating: map['Rating'] as String? ?? map['rating'] as String?,
      industry: map['Industry'] as String? ?? map['industry'] as String?,
      leadSource: map['LeadSource'] as String? ?? map['leadSource'] as String?,
      description: map['Description'] as String? ?? map['description'] as String?,
      street: map['Street'] as String? ?? map['street'] as String?,
      city: map['City'] as String? ?? map['city'] as String?,
      state: map['State'] as String? ?? map['state'] as String?,
      postalCode: map['PostalCode'] as String? ?? map['postalCode'] as String?,
      numberOfEmployees: _parseInt(map['NumberOfEmployees'] ?? map['numberOfEmployees']),
      annualRevenue: _parseDouble(map['AnnualRevenue'] ?? map['annualRevenue']),
      website: map['Website'] as String? ?? map['website'] as String?,
      createdAt: _parseDateTime(map['CreatedDate'] ?? map['createdAt']),
      updatedAt: _parseDateTime(map['LastModifiedDate'] ?? map['updatedAt']),
    );
  }

  /// Convert to API-compatible map
  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'firstName': firstName,
      'lastName': lastName,
      'company': company,
      'title': title,
      'email': email,
      'phone': phone,
      'mobilePhone': mobilePhone,
      'status': status,
      'rating': rating,
      'industry': industry,
      'leadSource': leadSource,
      'description': description,
      'street': street,
      'city': city,
      'state': state,
      'postalCode': postalCode,
      'numberOfEmployees': numberOfEmployees,
      'annualRevenue': annualRevenue,
      'website': website,
      'createdAt': createdAt?.toIso8601String(),
      'updatedAt': updatedAt?.toIso8601String(),
    };
  }

  /// Check if cache entry is stale (older than given duration)
  bool isStale(Duration ttl) {
    return DateTime.now().difference(cachedAt) > ttl;
  }

  CachedLead copyWith({
    String? id,
    String? firstName,
    String? lastName,
    String? company,
    String? title,
    String? email,
    String? phone,
    String? mobilePhone,
    String? status,
    String? rating,
    String? industry,
    String? leadSource,
    String? description,
    String? street,
    String? city,
    String? state,
    String? postalCode,
    int? numberOfEmployees,
    double? annualRevenue,
    String? website,
    DateTime? createdAt,
    DateTime? updatedAt,
    DateTime? cachedAt,
  }) {
    return CachedLead(
      id: id ?? this.id,
      firstName: firstName ?? this.firstName,
      lastName: lastName ?? this.lastName,
      company: company ?? this.company,
      title: title ?? this.title,
      email: email ?? this.email,
      phone: phone ?? this.phone,
      mobilePhone: mobilePhone ?? this.mobilePhone,
      status: status ?? this.status,
      rating: rating ?? this.rating,
      industry: industry ?? this.industry,
      leadSource: leadSource ?? this.leadSource,
      description: description ?? this.description,
      street: street ?? this.street,
      city: city ?? this.city,
      state: state ?? this.state,
      postalCode: postalCode ?? this.postalCode,
      numberOfEmployees: numberOfEmployees ?? this.numberOfEmployees,
      annualRevenue: annualRevenue ?? this.annualRevenue,
      website: website ?? this.website,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      cachedAt: cachedAt ?? this.cachedAt,
    );
  }

  @override
  String toString() => 'CachedLead(id: $id, name: $fullName, company: $company)';

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is CachedLead && runtimeType == other.runtimeType && id == other.id;

  @override
  int get hashCode => id.hashCode;

  static int? _parseInt(dynamic value) {
    if (value == null) return null;
    if (value is int) return value;
    if (value is num) return value.toInt();
    if (value is String) return int.tryParse(value);
    return null;
  }

  static double? _parseDouble(dynamic value) {
    if (value == null) return null;
    if (value is double) return value;
    if (value is num) return value.toDouble();
    if (value is String) return double.tryParse(value);
    return null;
  }

  static DateTime? _parseDateTime(dynamic value) {
    if (value == null) return null;
    if (value is DateTime) return value;
    if (value is String) return DateTime.tryParse(value);
    return null;
  }
}

/// Lead cache box helper
class LeadCacheBox {
  static const String boxName = 'cached_leads';
  static Box<CachedLead>? _box;

  /// Initialize the lead cache box
  static Future<void> init() async {
    if (!Hive.isAdapterRegistered(1)) {
      Hive.registerAdapter(CachedLeadAdapter());
    }
    _box = await Hive.openBox<CachedLead>(boxName);
  }

  /// Get the box instance
  static Box<CachedLead>? get box => _box;

  /// Check if box is open
  static bool get isOpen => _box != null && _box!.isOpen;

  /// Get all cached leads
  static List<CachedLead> getAll() {
    if (!isOpen) return [];
    return _box!.values.toList();
  }

  /// Get lead by ID
  static CachedLead? getById(String id) {
    if (!isOpen) return null;
    try {
      return _box!.values.firstWhere((lead) => lead.id == id);
    } catch (e) {
      return null;
    }
  }

  /// Save a lead to cache
  static Future<void> save(CachedLead lead) async {
    if (!isOpen) return;
    await _box!.put(lead.id, lead);
  }

  /// Save multiple leads to cache
  static Future<void> saveAll(List<CachedLead> leads) async {
    if (!isOpen) return;
    final map = {for (var lead in leads) lead.id: lead};
    await _box!.putAll(map);
  }

  /// Delete a lead from cache
  static Future<void> delete(String id) async {
    if (!isOpen) return;
    await _box!.delete(id);
  }

  /// Clear all cached leads
  static Future<void> clear() async {
    if (!isOpen) return;
    await _box!.clear();
  }

  /// Get count of cached leads
  static int get count => isOpen ? _box!.length : 0;

  /// Close the box
  static Future<void> close() async {
    if (isOpen) {
      await _box!.close();
      _box = null;
    }
  }
}
