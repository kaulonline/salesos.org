import 'package:hive/hive.dart';

part 'cached_contact.g.dart';

/// Hive adapter for caching Contact entities
///
/// This model stores contacts locally for offline access and caching.
/// Registered as typeId 2 in Hive.
@HiveType(typeId: 2)
class CachedContact extends HiveObject {
  @HiveField(0)
  final String id;

  @HiveField(1)
  final String? firstName;

  @HiveField(2)
  final String? lastName;

  @HiveField(3)
  final String? email;

  @HiveField(4)
  final String? phone;

  @HiveField(5)
  final String? mobilePhone;

  @HiveField(6)
  final String? title;

  @HiveField(7)
  final String? department;

  @HiveField(8)
  final String? accountId;

  @HiveField(9)
  final String? accountName;

  @HiveField(10)
  final String? mailingStreet;

  @HiveField(11)
  final String? mailingCity;

  @HiveField(12)
  final String? mailingState;

  @HiveField(13)
  final String? mailingPostalCode;

  @HiveField(14)
  final String? description;

  @HiveField(15)
  final DateTime? createdAt;

  @HiveField(16)
  final DateTime? updatedAt;

  @HiveField(17)
  final DateTime cachedAt;

  CachedContact({
    required this.id,
    this.firstName,
    this.lastName,
    this.email,
    this.phone,
    this.mobilePhone,
    this.title,
    this.department,
    this.accountId,
    this.accountName,
    this.mailingStreet,
    this.mailingCity,
    this.mailingState,
    this.mailingPostalCode,
    this.description,
    this.createdAt,
    this.updatedAt,
    DateTime? cachedAt,
  }) : cachedAt = cachedAt ?? DateTime.now();

  /// Full name of the contact
  String get fullName {
    final parts = [firstName, lastName].whereType<String>().toList();
    return parts.isEmpty ? 'Unknown' : parts.join(' ');
  }

  /// Full mailing address
  String get mailingAddress {
    final parts = [mailingStreet, mailingCity, mailingState, mailingPostalCode]
        .whereType<String>()
        .where((s) => s.isNotEmpty)
        .toList();
    return parts.join(', ');
  }

  /// Create from API response map (Salesforce or Local API format)
  factory CachedContact.fromMap(Map<String, dynamic> map) {
    // Handle nested Account object from Salesforce
    final account = map['Account'] as Map<String, dynamic>?;

    return CachedContact(
      id: map['Id'] as String? ?? map['id'] as String? ?? '',
      firstName: map['FirstName'] as String? ?? map['firstName'] as String?,
      lastName: map['LastName'] as String? ?? map['lastName'] as String?,
      email: map['Email'] as String? ?? map['email'] as String?,
      phone: map['Phone'] as String? ?? map['phone'] as String?,
      mobilePhone: map['MobilePhone'] as String? ?? map['mobilePhone'] as String?,
      title: map['Title'] as String? ?? map['title'] as String?,
      department: map['Department'] as String? ?? map['department'] as String?,
      accountId: map['AccountId'] as String? ??
          map['accountId'] as String? ??
          account?['Id'] as String?,
      accountName: account?['Name'] as String? ?? map['accountName'] as String?,
      mailingStreet: map['MailingStreet'] as String? ?? map['mailingStreet'] as String?,
      mailingCity: map['MailingCity'] as String? ?? map['mailingCity'] as String?,
      mailingState: map['MailingState'] as String? ?? map['mailingState'] as String?,
      mailingPostalCode: map['MailingPostalCode'] as String? ?? map['mailingPostalCode'] as String?,
      description: map['Description'] as String? ?? map['description'] as String?,
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
      'email': email,
      'phone': phone,
      'mobilePhone': mobilePhone,
      'title': title,
      'department': department,
      'accountId': accountId,
      'accountName': accountName,
      'mailingStreet': mailingStreet,
      'mailingCity': mailingCity,
      'mailingState': mailingState,
      'mailingPostalCode': mailingPostalCode,
      'description': description,
      'createdAt': createdAt?.toIso8601String(),
      'updatedAt': updatedAt?.toIso8601String(),
    };
  }

  /// Check if cache entry is stale (older than given duration)
  bool isStale(Duration ttl) {
    return DateTime.now().difference(cachedAt) > ttl;
  }

  CachedContact copyWith({
    String? id,
    String? firstName,
    String? lastName,
    String? email,
    String? phone,
    String? mobilePhone,
    String? title,
    String? department,
    String? accountId,
    String? accountName,
    String? mailingStreet,
    String? mailingCity,
    String? mailingState,
    String? mailingPostalCode,
    String? description,
    DateTime? createdAt,
    DateTime? updatedAt,
    DateTime? cachedAt,
  }) {
    return CachedContact(
      id: id ?? this.id,
      firstName: firstName ?? this.firstName,
      lastName: lastName ?? this.lastName,
      email: email ?? this.email,
      phone: phone ?? this.phone,
      mobilePhone: mobilePhone ?? this.mobilePhone,
      title: title ?? this.title,
      department: department ?? this.department,
      accountId: accountId ?? this.accountId,
      accountName: accountName ?? this.accountName,
      mailingStreet: mailingStreet ?? this.mailingStreet,
      mailingCity: mailingCity ?? this.mailingCity,
      mailingState: mailingState ?? this.mailingState,
      mailingPostalCode: mailingPostalCode ?? this.mailingPostalCode,
      description: description ?? this.description,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      cachedAt: cachedAt ?? this.cachedAt,
    );
  }

  @override
  String toString() => 'CachedContact(id: $id, name: $fullName, account: $accountName)';

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is CachedContact && runtimeType == other.runtimeType && id == other.id;

  @override
  int get hashCode => id.hashCode;

  static DateTime? _parseDateTime(dynamic value) {
    if (value == null) return null;
    if (value is DateTime) return value;
    if (value is String) return DateTime.tryParse(value);
    return null;
  }
}

/// Contact cache box helper
class ContactCacheBox {
  static const String boxName = 'cached_contacts';
  static Box<CachedContact>? _box;

  /// Initialize the contact cache box
  static Future<void> init() async {
    if (!Hive.isAdapterRegistered(2)) {
      Hive.registerAdapter(CachedContactAdapter());
    }
    _box = await Hive.openBox<CachedContact>(boxName);
  }

  /// Get the box instance
  static Box<CachedContact>? get box => _box;

  /// Check if box is open
  static bool get isOpen => _box != null && _box!.isOpen;

  /// Get all cached contacts
  static List<CachedContact> getAll() {
    if (!isOpen) return [];
    return _box!.values.toList();
  }

  /// Get contact by ID
  static CachedContact? getById(String id) {
    if (!isOpen) return null;
    try {
      return _box!.values.firstWhere((contact) => contact.id == id);
    } catch (e) {
      return null;
    }
  }

  /// Get contacts by account ID
  static List<CachedContact> getByAccountId(String accountId) {
    if (!isOpen) return [];
    return _box!.values.where((contact) => contact.accountId == accountId).toList();
  }

  /// Save a contact to cache
  static Future<void> save(CachedContact contact) async {
    if (!isOpen) return;
    await _box!.put(contact.id, contact);
  }

  /// Save multiple contacts to cache
  static Future<void> saveAll(List<CachedContact> contacts) async {
    if (!isOpen) return;
    final map = {for (var contact in contacts) contact.id: contact};
    await _box!.putAll(map);
  }

  /// Delete a contact from cache
  static Future<void> delete(String id) async {
    if (!isOpen) return;
    await _box!.delete(id);
  }

  /// Clear all cached contacts
  static Future<void> clear() async {
    if (!isOpen) return;
    await _box!.clear();
  }

  /// Get count of cached contacts
  static int get count => isOpen ? _box!.length : 0;

  /// Close the box
  static Future<void> close() async {
    if (isOpen) {
      await _box!.close();
      _box = null;
    }
  }
}
