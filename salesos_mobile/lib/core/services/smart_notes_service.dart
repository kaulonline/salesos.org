import 'dart:io';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../network/api_client.dart';
import 'smart_capture_service.dart';

/// A note entity from the CRM
class CrmNote {
  final String id;
  final String? title;
  final String body;
  final bool isPrivate;
  // Local IRIS entity IDs
  final String? leadId;
  final String? accountId;
  final String? contactId;
  final String? opportunityId;
  // Salesforce entity IDs (for Salesforce mode)
  final String? sfLeadId;
  final String? sfAccountId;
  final String? sfContactId;
  final String? sfOpportunityId;
  final DateTime createdAt;
  final DateTime updatedAt;
  final LinkedEntity? lead;
  final LinkedEntity? account;
  final LinkedEntity? contact;
  final LinkedEntity? opportunity;

  CrmNote({
    required this.id,
    this.title,
    required this.body,
    this.isPrivate = false,
    this.leadId,
    this.accountId,
    this.contactId,
    this.opportunityId,
    this.sfLeadId,
    this.sfAccountId,
    this.sfContactId,
    this.sfOpportunityId,
    required this.createdAt,
    required this.updatedAt,
    this.lead,
    this.account,
    this.contact,
    this.opportunity,
  });

  factory CrmNote.fromJson(Map<String, dynamic> json) {
    return CrmNote(
      id: json['id'] ?? '',
      title: json['title'],
      body: json['body'] ?? '',
      isPrivate: json['isPrivate'] ?? false,
      leadId: json['leadId'],
      accountId: json['accountId'],
      contactId: json['contactId'],
      opportunityId: json['opportunityId'],
      sfLeadId: json['sfLeadId'],
      sfAccountId: json['sfAccountId'],
      sfContactId: json['sfContactId'],
      sfOpportunityId: json['sfOpportunityId'],
      createdAt: DateTime.parse(json['createdAt'] ?? DateTime.now().toIso8601String()),
      updatedAt: DateTime.parse(json['updatedAt'] ?? DateTime.now().toIso8601String()),
      lead: json['lead'] != null ? LinkedEntity.fromJson(json['lead'], type: 'lead') : null,
      account: json['account'] != null ? LinkedEntity.fromJson(json['account'], type: 'account') : null,
      contact: json['contact'] != null ? LinkedEntity.fromJson(json['contact'], type: 'contact') : null,
      opportunity: json['opportunity'] != null ? LinkedEntity.fromJson(json['opportunity'], type: 'opportunity') : null,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'title': title,
        'body': body,
        'isPrivate': isPrivate,
        'leadId': leadId,
        'accountId': accountId,
        'contactId': contactId,
        'opportunityId': opportunityId,
        'sfLeadId': sfLeadId,
        'sfAccountId': sfAccountId,
        'sfContactId': sfContactId,
        'sfOpportunityId': sfOpportunityId,
      };

  /// Get the linked entity display name
  String get linkedEntityName {
    if (lead != null) return lead!.displayName;
    if (account != null) return account!.name ?? 'Account';
    if (contact != null) return contact!.displayName;
    if (opportunity != null) return opportunity!.name ?? 'Opportunity';
    // For Salesforce-only links, show the SF ID as fallback
    if (sfLeadId != null) return 'Lead ($sfLeadId)';
    if (sfAccountId != null) return 'Account ($sfAccountId)';
    if (sfContactId != null) return 'Contact ($sfContactId)';
    if (sfOpportunityId != null) return 'Opportunity ($sfOpportunityId)';
    return 'Unlinked';
  }

  /// Get the linked entity type (checks both local and Salesforce IDs)
  String? get linkedEntityType {
    if (leadId != null || sfLeadId != null) return 'lead';
    if (accountId != null || sfAccountId != null) return 'account';
    if (contactId != null || sfContactId != null) return 'contact';
    if (opportunityId != null || sfOpportunityId != null) return 'opportunity';
    return null;
  }

  /// Get the linked entity ID (prefers local ID, falls back to Salesforce ID)
  String? get linkedEntityId => leadId ?? sfLeadId ?? accountId ?? sfAccountId ??
                                 contactId ?? sfContactId ?? opportunityId ?? sfOpportunityId;

  /// Check if linked to a Salesforce entity (not local)
  bool get isLinkedToSalesforce => sfLeadId != null || sfAccountId != null ||
                                    sfContactId != null || sfOpportunityId != null;

  /// Check if linked to any entity (local or Salesforce)
  bool get hasLinkedEntity => linkedEntityId != null;

  /// Get the first linked entity (for display purposes)
  LinkedEntity? get linkedEntity {
    if (lead != null) return lead;
    if (account != null) return account;
    if (contact != null) return contact;
    if (opportunity != null) return opportunity;
    // For Salesforce-only links, create a synthetic LinkedEntity
    if (sfLeadId != null) {
      return LinkedEntity(id: sfLeadId!, salesforceId: sfLeadId, type: 'lead');
    }
    if (sfAccountId != null) {
      return LinkedEntity(id: sfAccountId!, salesforceId: sfAccountId, type: 'account');
    }
    if (sfContactId != null) {
      return LinkedEntity(id: sfContactId!, salesforceId: sfContactId, type: 'contact');
    }
    if (sfOpportunityId != null) {
      return LinkedEntity(id: sfOpportunityId!, salesforceId: sfOpportunityId, type: 'opportunity');
    }
    return null;
  }
}

/// Linked entity reference
class LinkedEntity {
  final String id;
  final String? salesforceId; // Salesforce ID if synced
  final String? firstName;
  final String? lastName;
  final String? name;
  final String? company;
  final String? stage;
  final String type; // Entity type: lead, account, contact, opportunity

  LinkedEntity({
    required this.id,
    this.salesforceId,
    this.firstName,
    this.lastName,
    this.name,
    this.company,
    this.stage,
    this.type = 'unknown',
  });

  factory LinkedEntity.fromJson(Map<String, dynamic> json, {String type = 'unknown'}) {
    return LinkedEntity(
      id: json['id'] ?? '',
      salesforceId: json['salesforceId'],
      firstName: json['firstName'],
      lastName: json['lastName'],
      name: json['name'],
      company: json['company'],
      stage: json['stage'],
      type: type,
    );
  }

  String get displayName {
    if (firstName != null || lastName != null) {
      return '${firstName ?? ''} ${lastName ?? ''}'.trim();
    }
    return name ?? 'Unknown';
  }
}

/// Smart Notes Service for managing notes with OCR integration
class SmartNotesService {
  final ApiClient _apiClient;
  final SmartCaptureService _captureService;

  SmartNotesService(this._apiClient, this._captureService);

  /// Get all notes for the current user
  /// Supports both local IRIS IDs and Salesforce IDs for filtering
  Future<List<CrmNote>> getNotes({
    String? search,
    // Local IRIS entity IDs
    String? leadId,
    String? accountId,
    String? contactId,
    String? opportunityId,
    // Salesforce entity IDs
    String? sfLeadId,
    String? sfAccountId,
    String? sfContactId,
    String? sfOpportunityId,
  }) async {
    try {
      final queryParams = <String, dynamic>{};
      if (search != null && search.isNotEmpty) queryParams['search'] = search;
      // Local IDs
      if (leadId != null) queryParams['leadId'] = leadId;
      if (accountId != null) queryParams['accountId'] = accountId;
      if (contactId != null) queryParams['contactId'] = contactId;
      if (opportunityId != null) queryParams['opportunityId'] = opportunityId;
      // Salesforce IDs
      if (sfLeadId != null) queryParams['sfLeadId'] = sfLeadId;
      if (sfAccountId != null) queryParams['sfAccountId'] = sfAccountId;
      if (sfContactId != null) queryParams['sfContactId'] = sfContactId;
      if (sfOpportunityId != null) queryParams['sfOpportunityId'] = sfOpportunityId;

      final response = await _apiClient.get('/notes', queryParameters: queryParams);

      // Handle different response types
      final dynamic rawData = response.data;
      List<dynamic> data;

      if (rawData is List) {
        data = rawData;
      } else if (rawData is Map && rawData.containsKey('data')) {
        // Handle paginated response
        data = rawData['data'] as List<dynamic>? ?? [];
      } else if (rawData is Map && rawData.containsKey('notes')) {
        // Handle wrapped response
        data = rawData['notes'] as List<dynamic>? ?? [];
      } else {
        data = [];
      }

      final notes = data.map((json) => CrmNote.fromJson(json as Map<String, dynamic>)).toList();
      return notes;
    } catch (e) {
      rethrow; // Let the provider handle the error instead of swallowing it
    }
  }

  /// Get notes for a specific entity
  /// Automatically detects if entityId is a Salesforce ID (starts with 00) or local ID
  Future<List<CrmNote>> getNotesForEntity(String entityId, String entityType, {bool? isSalesforceId}) async {
    // Auto-detect if it's a Salesforce ID (typically 15 or 18 chars, starts with 00)
    final isSfId = isSalesforceId ?? _isSalesforceId(entityId);

    switch (entityType.toLowerCase()) {
      case 'lead':
        return isSfId
            ? getNotes(sfLeadId: entityId)
            : getNotes(leadId: entityId);
      case 'account':
        return isSfId
            ? getNotes(sfAccountId: entityId)
            : getNotes(accountId: entityId);
      case 'contact':
        return isSfId
            ? getNotes(sfContactId: entityId)
            : getNotes(contactId: entityId);
      case 'opportunity':
        return isSfId
            ? getNotes(sfOpportunityId: entityId)
            : getNotes(opportunityId: entityId);
      default:
        return [];
    }
  }

  /// Check if an ID looks like a Salesforce ID
  /// Salesforce IDs are 15 or 18 characters and start with specific prefixes
  bool _isSalesforceId(String id) {
    if (id.length != 15 && id.length != 18) return false;
    // Salesforce IDs start with 00 (accounts), 003 (contacts), 006 (opps), 00Q (leads), etc.
    return RegExp(r'^[0-9a-zA-Z]{15,18}$').hasMatch(id) &&
           (id.startsWith('00') || id.startsWith('a0')); // Common SF prefixes
  }

  /// Get a single note by ID
  Future<CrmNote?> getNote(String noteId) async {
    try {
      final response = await _apiClient.get('/notes/$noteId');
      return CrmNote.fromJson(response.data);
    } catch (e) {
      return null;
    }
  }

  /// Create a new note
  /// Supports both local IRIS entity IDs and Salesforce entity IDs
  Future<CrmNote?> createNote({
    String? title,
    required String body,
    bool isPrivate = false,
    // Local IRIS entity IDs
    String? leadId,
    String? accountId,
    String? contactId,
    String? opportunityId,
    // Salesforce entity IDs
    String? sfLeadId,
    String? sfAccountId,
    String? sfContactId,
    String? sfOpportunityId,
  }) async {
    try {
      final data = {
        'title': title,
        'body': body,
        'isPrivate': isPrivate,
        // Local IDs
        'leadId': ?leadId,
        'accountId': ?accountId,
        'contactId': ?contactId,
        'opportunityId': ?opportunityId,
        // Salesforce IDs
        'sfLeadId': ?sfLeadId,
        'sfAccountId': ?sfAccountId,
        'sfContactId': ?sfContactId,
        'sfOpportunityId': ?sfOpportunityId,
      };

      final response = await _apiClient.post('/notes', data: data);
      return CrmNote.fromJson(response.data);
    } catch (e) {
      return null;
    }
  }

  /// Create a note linked to an entity with auto-detection of ID type
  Future<CrmNote?> createNoteForEntity({
    String? title,
    required String body,
    bool isPrivate = false,
    required String entityId,
    required String entityType,
    bool? isSalesforceId,
  }) async {
    final isSfId = isSalesforceId ?? _isSalesforceId(entityId);

    switch (entityType.toLowerCase()) {
      case 'lead':
        return createNote(
          title: title,
          body: body,
          isPrivate: isPrivate,
          leadId: isSfId ? null : entityId,
          sfLeadId: isSfId ? entityId : null,
        );
      case 'account':
        return createNote(
          title: title,
          body: body,
          isPrivate: isPrivate,
          accountId: isSfId ? null : entityId,
          sfAccountId: isSfId ? entityId : null,
        );
      case 'contact':
        return createNote(
          title: title,
          body: body,
          isPrivate: isPrivate,
          contactId: isSfId ? null : entityId,
          sfContactId: isSfId ? entityId : null,
        );
      case 'opportunity':
        return createNote(
          title: title,
          body: body,
          isPrivate: isPrivate,
          opportunityId: isSfId ? null : entityId,
          sfOpportunityId: isSfId ? entityId : null,
        );
      default:
        return createNote(title: title, body: body, isPrivate: isPrivate);
    }
  }

  /// Update an existing note
  /// Supports both local IRIS entity IDs and Salesforce entity IDs
  Future<CrmNote?> updateNote(String noteId, {
    String? title,
    String? body,
    bool? isPrivate,
    // Local IRIS entity IDs
    String? leadId,
    String? accountId,
    String? contactId,
    String? opportunityId,
    // Salesforce entity IDs
    String? sfLeadId,
    String? sfAccountId,
    String? sfContactId,
    String? sfOpportunityId,
    // Set to true to clear all entity links
    bool clearEntityLinks = false,
  }) async {
    try {
      final data = <String, dynamic>{};
      if (title != null) data['title'] = title;
      if (body != null) data['body'] = body;
      if (isPrivate != null) data['isPrivate'] = isPrivate;

      // Handle entity link changes
      if (clearEntityLinks) {
        // Explicitly clear all entity links
        data['leadId'] = null;
        data['accountId'] = null;
        data['contactId'] = null;
        data['opportunityId'] = null;
        data['sfLeadId'] = null;
        data['sfAccountId'] = null;
        data['sfContactId'] = null;
        data['sfOpportunityId'] = null;
      } else {
        // Only update fields that are explicitly provided
        if (leadId != null) data['leadId'] = leadId;
        if (accountId != null) data['accountId'] = accountId;
        if (contactId != null) data['contactId'] = contactId;
        if (opportunityId != null) data['opportunityId'] = opportunityId;
        if (sfLeadId != null) data['sfLeadId'] = sfLeadId;
        if (sfAccountId != null) data['sfAccountId'] = sfAccountId;
        if (sfContactId != null) data['sfContactId'] = sfContactId;
        if (sfOpportunityId != null) data['sfOpportunityId'] = sfOpportunityId;
      }

      final response = await _apiClient.patch('/notes/$noteId', data: data);
      return CrmNote.fromJson(response.data);
    } catch (e) {
      return null;
    }
  }

  /// Delete a note
  Future<bool> deleteNote(String noteId) async {
    try {
      await _apiClient.delete('/notes/$noteId');
      return true;
    } catch (e) {
      return false;
    }
  }

  /// Capture and transcribe handwritten notes from camera
  Future<String?> captureAndTranscribe() async {
    final imageFile = await _captureService.captureFromCamera();
    if (imageFile == null) return null;

    final result = await _captureService.processHandwritten(imageFile);
    if (result.success) {
      return result.extractedData['text'] as String?;
    }
    return null;
  }

  /// Transcribe an image file to text
  Future<String?> transcribeImage(File imageFile) async {
    final result = await _captureService.processHandwritten(imageFile);
    if (result.success) {
      return result.extractedData['text'] as String?;
    }
    return null;
  }

  /// Create a note from captured handwritten image
  Future<CrmNote?> createNoteFromCapture(
    File imageFile, {
    String? title,
    String? linkedEntityId,
    String? linkedEntityType,
  }) async {
    final result = await _captureService.processHandwritten(
      imageFile,
      createNote: true,
      linkedEntityId: linkedEntityId,
      linkedEntityType: linkedEntityType,
      noteTitle: title,
    );

    if (result.success && result.createdEntity != null) {
      return getNote(result.createdEntity!.id);
    }
    return null;
  }

  /// Append transcribed text to an existing note
  Future<CrmNote?> appendTranscribedTextToNote(
    String noteId,
    File imageFile,
  ) async {
    // First get the existing note
    final existingNote = await getNote(noteId);
    if (existingNote == null) return null;

    // Transcribe the image
    final transcribedText = await transcribeImage(imageFile);
    if (transcribedText == null || transcribedText.isEmpty) return existingNote;

    // Append the transcribed text
    final newBody = '${existingNote.body}\n\n--- Transcribed Notes ---\n$transcribedText';

    return updateNote(noteId, body: newBody);
  }

  /// Create a note with smart entity detection - AI analyzes content and auto-links to CRM entities
  Future<SmartNoteResult> createSmartNote({
    String? title,
    required String body,
    bool isPrivate = false,
    String? explicitLeadId,
    String? explicitAccountId,
    String? explicitContactId,
    String? explicitOpportunityId,
  }) async {
    // If explicit entity is provided, skip AI detection
    if (explicitLeadId != null || explicitAccountId != null ||
        explicitContactId != null || explicitOpportunityId != null) {
      final note = await createNote(
        title: title,
        body: body,
        isPrivate: isPrivate,
        leadId: explicitLeadId,
        accountId: explicitAccountId,
        contactId: explicitContactId,
        opportunityId: explicitOpportunityId,
      );
      return SmartNoteResult(
        note: note,
        detectedEntities: [],
        autoLinked: false,
      );
    }

    // Use AI to detect entities in the note content
    try {
      final detectedEntities = await _detectEntitiesInText(body, title);

      String? linkedLeadId;
      String? linkedAccountId;
      String? linkedContactId;
      String? linkedOpportunityId;
      bool autoLinked = false;

      // Auto-link if we found a high-confidence match
      if (detectedEntities.isNotEmpty) {
        final bestMatch = detectedEntities.first;
        if (bestMatch.confidence >= 0.7) {
          switch (bestMatch.entityType) {
            case 'lead':
              linkedLeadId = bestMatch.entityId;
              break;
            case 'account':
              linkedAccountId = bestMatch.entityId;
              break;
            case 'contact':
              linkedContactId = bestMatch.entityId;
              break;
            case 'opportunity':
              linkedOpportunityId = bestMatch.entityId;
              break;
          }
          autoLinked = true;
        }
      }

      // Create the note with detected entity links
      final note = await createNote(
        title: title,
        body: body,
        isPrivate: isPrivate,
        leadId: linkedLeadId,
        accountId: linkedAccountId,
        contactId: linkedContactId,
        opportunityId: linkedOpportunityId,
      );

      return SmartNoteResult(
        note: note,
        detectedEntities: detectedEntities,
        autoLinked: autoLinked,
        linkedEntityId: linkedLeadId ?? linkedAccountId ?? linkedContactId ?? linkedOpportunityId,
        linkedEntityType: linkedLeadId != null ? 'lead'
            : linkedAccountId != null ? 'account'
            : linkedContactId != null ? 'contact'
            : linkedOpportunityId != null ? 'opportunity'
            : null,
      );
    } catch (e) {
      // Fallback to creating unlinked note
      final note = await createNote(
        title: title,
        body: body,
        isPrivate: isPrivate,
      );
      return SmartNoteResult(
        note: note,
        detectedEntities: [],
        autoLinked: false,
      );
    }
  }

  /// Detect CRM entities mentioned in text using AI
  Future<List<DetectedEntity>> _detectEntitiesInText(String body, String? title) async {
    try {
      final textToAnalyze = '${title ?? ''}\n$body'.trim();

      // Call the backend AI endpoint to detect entities
      final response = await _apiClient.post('/notes/detect-entities', data: {
        'text': textToAnalyze,
      });

      final data = response.data;
      if (data == null) return [];

      final List<dynamic> entities = data['entities'] ?? data['matches'] ?? [];
      return entities.map((e) => DetectedEntity.fromJson(e as Map<String, dynamic>)).toList()
        ..sort((a, b) => b.confidence.compareTo(a.confidence)); // Sort by confidence
    } catch (e) {
      // Try local fuzzy matching as fallback
      return _localEntitySearch(body, title);
    }
  }

  /// Local fuzzy search for entities as fallback
  Future<List<DetectedEntity>> _localEntitySearch(String body, String? title) async {
    final textToAnalyze = '${title ?? ''}\n$body'.toLowerCase();
    final detectedEntities = <DetectedEntity>[];

    try {
      // Search leads
      final leadsResponse = await _apiClient.get('/leads', queryParameters: {'limit': '50'});
      final leads = _parseListResponse(leadsResponse.data);
      for (final lead in leads) {
        final name = '${lead['firstName'] ?? ''} ${lead['lastName'] ?? ''}'.trim().toLowerCase();
        final company = (lead['company'] ?? '').toString().toLowerCase();
        final email = (lead['email'] ?? '').toString().toLowerCase();

        if (name.isNotEmpty && textToAnalyze.contains(name)) {
          detectedEntities.add(DetectedEntity(
            entityId: lead['id'] ?? lead['Id'] ?? '',
            entityType: 'lead',
            entityName: '${lead['firstName'] ?? ''} ${lead['lastName'] ?? ''}'.trim(),
            confidence: 0.8,
            matchedText: name,
          ));
        } else if (company.isNotEmpty && company.length > 3 && textToAnalyze.contains(company)) {
          detectedEntities.add(DetectedEntity(
            entityId: lead['id'] ?? lead['Id'] ?? '',
            entityType: 'lead',
            entityName: '${lead['firstName'] ?? ''} ${lead['lastName'] ?? ''}'.trim(),
            confidence: 0.6,
            matchedText: company,
          ));
        } else if (email.isNotEmpty && textToAnalyze.contains(email)) {
          detectedEntities.add(DetectedEntity(
            entityId: lead['id'] ?? lead['Id'] ?? '',
            entityType: 'lead',
            entityName: '${lead['firstName'] ?? ''} ${lead['lastName'] ?? ''}'.trim(),
            confidence: 0.9,
            matchedText: email,
          ));
        }
      }

      // Search contacts
      final contactsResponse = await _apiClient.get('/contacts', queryParameters: {'limit': '50'});
      final contacts = _parseListResponse(contactsResponse.data);
      for (final contact in contacts) {
        final name = '${contact['firstName'] ?? ''} ${contact['lastName'] ?? ''}'.trim().toLowerCase();
        final email = (contact['email'] ?? '').toString().toLowerCase();

        if (name.isNotEmpty && textToAnalyze.contains(name)) {
          detectedEntities.add(DetectedEntity(
            entityId: contact['id'] ?? contact['Id'] ?? '',
            entityType: 'contact',
            entityName: '${contact['firstName'] ?? ''} ${contact['lastName'] ?? ''}'.trim(),
            confidence: 0.8,
            matchedText: name,
          ));
        } else if (email.isNotEmpty && textToAnalyze.contains(email)) {
          detectedEntities.add(DetectedEntity(
            entityId: contact['id'] ?? contact['Id'] ?? '',
            entityType: 'contact',
            entityName: '${contact['firstName'] ?? ''} ${contact['lastName'] ?? ''}'.trim(),
            confidence: 0.9,
            matchedText: email,
          ));
        }
      }

      // Search accounts
      final accountsResponse = await _apiClient.get('/accounts', queryParameters: {'limit': '50'});
      final accounts = _parseListResponse(accountsResponse.data);
      for (final account in accounts) {
        final name = (account['name'] ?? account['Name'] ?? '').toString().toLowerCase();

        if (name.isNotEmpty && name.length > 3 && textToAnalyze.contains(name)) {
          detectedEntities.add(DetectedEntity(
            entityId: account['id'] ?? account['Id'] ?? '',
            entityType: 'account',
            entityName: account['name'] ?? account['Name'] ?? '',
            confidence: 0.75,
            matchedText: name,
          ));
        }
      }
    } catch (e) {
      // Silently ignore
    }

    // Sort by confidence and remove duplicates
    detectedEntities.sort((a, b) => b.confidence.compareTo(a.confidence));
    return detectedEntities.take(5).toList();
  }

  List<Map<String, dynamic>> _parseListResponse(dynamic data) {
    if (data is List) {
      return data.cast<Map<String, dynamic>>();
    } else if (data is Map) {
      if (data.containsKey('data')) {
        return (data['data'] as List?)?.cast<Map<String, dynamic>>() ?? [];
      }
      if (data.containsKey('items')) {
        return (data['items'] as List?)?.cast<Map<String, dynamic>>() ?? [];
      }
    }
    return [];
  }

  /// Link an existing note to an entity
  /// Automatically detects if entityId is a Salesforce ID or local ID
  Future<CrmNote?> linkNoteToEntity(
    String noteId,
    String entityId,
    String entityType, {
    bool? isSalesforceId,
  }) async {
    try {
      final isSfId = isSalesforceId ?? _isSalesforceId(entityId);
      final data = <String, dynamic>{};

      switch (entityType.toLowerCase()) {
        case 'lead':
          if (isSfId) {
            data['sfLeadId'] = entityId;
            data['leadId'] = null; // Clear local ID
          } else {
            data['leadId'] = entityId;
            data['sfLeadId'] = null; // Clear SF ID
          }
          break;
        case 'account':
          if (isSfId) {
            data['sfAccountId'] = entityId;
            data['accountId'] = null;
          } else {
            data['accountId'] = entityId;
            data['sfAccountId'] = null;
          }
          break;
        case 'contact':
          if (isSfId) {
            data['sfContactId'] = entityId;
            data['contactId'] = null;
          } else {
            data['contactId'] = entityId;
            data['sfContactId'] = null;
          }
          break;
        case 'opportunity':
          if (isSfId) {
            data['sfOpportunityId'] = entityId;
            data['opportunityId'] = null;
          } else {
            data['opportunityId'] = entityId;
            data['sfOpportunityId'] = null;
          }
          break;
      }

      final response = await _apiClient.patch('/notes/$noteId', data: data);
      return CrmNote.fromJson(response.data);
    } catch (e) {
      return null;
    }
  }

  /// Unlink a note from all entities
  Future<CrmNote?> unlinkNote(String noteId) async {
    try {
      final data = <String, dynamic>{
        'leadId': null,
        'accountId': null,
        'contactId': null,
        'opportunityId': null,
        'sfLeadId': null,
        'sfAccountId': null,
        'sfContactId': null,
        'sfOpportunityId': null,
      };

      final response = await _apiClient.patch('/notes/$noteId', data: data);
      return CrmNote.fromJson(response.data);
    } catch (e) {
      return null;
    }
  }

  // ============================================
  // AI Processing & Pending Actions
  // ============================================

  /// Process a note with AI to extract insights and generate actions
  Future<NoteProcessingResult?> processNoteWithAI(String noteId) async {
    try {
      final response = await _apiClient.post('/notes/$noteId/process');
      return NoteProcessingResult.fromJson(response.data);
    } catch (e) {
      return null;
    }
  }

  /// Re-process a note with AI (clears pending actions first)
  Future<NoteProcessingResult?> reprocessNote(String noteId) async {
    try {
      final response = await _apiClient.post('/notes/$noteId/reprocess');
      return NoteProcessingResult.fromJson(response.data);
    } catch (e) {
      return null;
    }
  }

  /// Get AI extraction results for a note
  Future<NoteExtractionData?> getExtractionResults(String noteId) async {
    try {
      final response = await _apiClient.get('/notes/$noteId/extraction');
      if (response.data != null) {
        return NoteExtractionData.fromJson(response.data);
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  /// Get pending actions for a note
  Future<List<PendingAction>> getPendingActions(String noteId) async {
    try {
      final response = await _apiClient.get('/notes/$noteId/pending-actions');
      final data = response.data;
      if (data is List) {
        return data.map((a) => PendingAction.fromJson(a)).toList();
      }
      return [];
    } catch (e) {
      return [];
    }
  }

  /// Get all pending actions for current user
  Future<List<PendingAction>> getAllPendingActions({int? limit}) async {
    try {
      final queryParams = <String, dynamic>{};
      if (limit != null) queryParams['limit'] = limit.toString();

      final response = await _apiClient.get('/notes/actions/pending', queryParameters: queryParams);
      final data = response.data;
      if (data is List) {
        return data.map((a) => PendingAction.fromJson(a)).toList();
      }
      return [];
    } catch (e) {
      return [];
    }
  }

  /// Get action statistics
  Future<ActionStats?> getActionStats() async {
    try {
      final response = await _apiClient.get('/notes/actions/stats');
      return ActionStats.fromJson(response.data);
    } catch (e) {
      return null;
    }
  }

  /// Approve a pending action
  Future<bool> approveAction(String actionId) async {
    try {
      await _apiClient.post('/notes/actions/$actionId/approve');
      return true;
    } catch (e) {
      return false;
    }
  }

  /// Reject a pending action
  Future<bool> rejectAction(String actionId) async {
    try {
      await _apiClient.post('/notes/actions/$actionId/reject');
      return true;
    } catch (e) {
      return false;
    }
  }

  /// Bulk approve/reject actions
  Future<BulkActionResult> bulkProcessActions(
    List<String> actionIds,
    bool approve,
  ) async {
    try {
      final response = await _apiClient.post('/notes/actions/bulk', data: {
        'actionIds': actionIds,
        'approve': approve,
      });
      return BulkActionResult.fromJson(response.data);
    } catch (e) {
      return BulkActionResult(processed: 0, failed: actionIds.length);
    }
  }
}

/// Note processing result from AI
class NoteProcessingResult {
  final String id;
  final String? processingStatus;
  final DateTime? processedAt;
  final NoteExtractionData? extractedData;
  final List<PendingAction> pendingActions;

  NoteProcessingResult({
    required this.id,
    this.processingStatus,
    this.processedAt,
    this.extractedData,
    this.pendingActions = const [],
  });

  factory NoteProcessingResult.fromJson(Map<String, dynamic> json) {
    return NoteProcessingResult(
      id: json['id'] ?? '',
      processingStatus: json['processingStatus'],
      processedAt: json['processedAt'] != null
          ? DateTime.parse(json['processedAt'])
          : null,
      extractedData: json['extractedData'] != null
          ? NoteExtractionData.fromJson(json['extractedData'])
          : null,
      pendingActions: json['pendingActions'] != null
          ? (json['pendingActions'] as List)
              .map((a) => PendingAction.fromJson(a))
              .toList()
          : [],
    );
  }
}

/// AI extraction data from note
class NoteExtractionData {
  final String? summary;
  final List<ExtractedActionItem> actionItems;
  final List<ProposedCrmUpdate> crmUpdates;
  final SentimentData? sentiment;

  NoteExtractionData({
    this.summary,
    this.actionItems = const [],
    this.crmUpdates = const [],
    this.sentiment,
  });

  factory NoteExtractionData.fromJson(Map<String, dynamic> json) {
    return NoteExtractionData(
      summary: json['summary'],
      actionItems: json['actionItems'] != null
          ? (json['actionItems'] as List)
              .map((a) => ExtractedActionItem.fromJson(a))
              .toList()
          : [],
      crmUpdates: json['crmUpdates'] != null
          ? (json['crmUpdates'] as List)
              .map((u) => ProposedCrmUpdate.fromJson(u))
              .toList()
          : [],
      sentiment: json['sentiment'] != null
          ? SentimentData.fromJson(json['sentiment'])
          : null,
    );
  }
}

/// Extracted action item from note
class ExtractedActionItem {
  final String description;
  final String? assignee;
  final String? dueDate;
  final String priority;
  final double confidence;
  final String? sourceText;

  ExtractedActionItem({
    required this.description,
    this.assignee,
    this.dueDate,
    this.priority = 'MEDIUM',
    this.confidence = 0.5,
    this.sourceText,
  });

  factory ExtractedActionItem.fromJson(Map<String, dynamic> json) {
    return ExtractedActionItem(
      description: json['description'] ?? '',
      assignee: json['assignee'],
      dueDate: json['dueDate'],
      priority: json['priority'] ?? 'MEDIUM',
      confidence: (json['confidence'] ?? 0.5).toDouble(),
      sourceText: json['sourceText'],
    );
  }
}

/// Proposed CRM update from note
class ProposedCrmUpdate {
  final String entityType;
  final String? entityId;
  final String? entityName;
  final String fieldName;
  final dynamic proposedValue;
  final double confidence;
  final String? reasoning;

  ProposedCrmUpdate({
    required this.entityType,
    this.entityId,
    this.entityName,
    required this.fieldName,
    this.proposedValue,
    this.confidence = 0.5,
    this.reasoning,
  });

  factory ProposedCrmUpdate.fromJson(Map<String, dynamic> json) {
    return ProposedCrmUpdate(
      entityType: json['entityType'] ?? '',
      entityId: json['entityId'],
      entityName: json['entityName'],
      fieldName: json['fieldName'] ?? '',
      proposedValue: json['proposedValue'],
      confidence: (json['confidence'] ?? 0.5).toDouble(),
      reasoning: json['reasoning'],
    );
  }
}

/// Sentiment analysis data
class SentimentData {
  final String overall;
  final List<String> positiveSignals;
  final List<String> negativeSignals;
  final List<String> riskFactors;

  SentimentData({
    this.overall = 'NEUTRAL',
    this.positiveSignals = const [],
    this.negativeSignals = const [],
    this.riskFactors = const [],
  });

  factory SentimentData.fromJson(Map<String, dynamic> json) {
    return SentimentData(
      overall: json['overall'] ?? 'NEUTRAL',
      positiveSignals: List<String>.from(json['positiveSignals'] ?? []),
      negativeSignals: List<String>.from(json['negativeSignals'] ?? []),
      riskFactors: List<String>.from(json['riskFactors'] ?? []),
    );
  }
}

/// Pending action from note intelligence
class PendingAction {
  final String id;
  final String noteId;
  final String actionType;
  final String status;
  final String? targetEntity;
  final String? targetEntityId;
  final String? fieldName;
  final dynamic proposedValue;
  final double confidence;
  final String? reasoning;
  final String? sourceText;
  final DateTime createdAt;

  PendingAction({
    required this.id,
    required this.noteId,
    required this.actionType,
    required this.status,
    this.targetEntity,
    this.targetEntityId,
    this.fieldName,
    this.proposedValue,
    this.confidence = 0.5,
    this.reasoning,
    this.sourceText,
    required this.createdAt,
  });

  factory PendingAction.fromJson(Map<String, dynamic> json) {
    return PendingAction(
      id: json['id'] ?? '',
      noteId: json['noteId'] ?? '',
      actionType: json['actionType'] ?? '',
      status: json['status'] ?? 'PENDING',
      targetEntity: json['targetEntity'],
      targetEntityId: json['targetEntityId'],
      fieldName: json['fieldName'],
      proposedValue: json['proposedValue'],
      confidence: (json['confidence'] ?? 0.5).toDouble(),
      reasoning: json['reasoning'],
      sourceText: json['sourceText'],
      createdAt: DateTime.parse(json['createdAt'] ?? DateTime.now().toIso8601String()),
    );
  }
}

/// Action statistics
class ActionStats {
  final int pending;
  final int completed;
  final int rejected;
  final int failed;

  ActionStats({
    this.pending = 0,
    this.completed = 0,
    this.rejected = 0,
    this.failed = 0,
  });

  factory ActionStats.fromJson(Map<String, dynamic> json) {
    return ActionStats(
      pending: json['pending'] ?? 0,
      completed: json['completed'] ?? 0,
      rejected: json['rejected'] ?? 0,
      failed: json['failed'] ?? 0,
    );
  }

  int get total => pending + completed + rejected + failed;
}

/// Bulk action result
class BulkActionResult {
  final int processed;
  final int failed;
  final List<dynamic>? results;

  BulkActionResult({
    required this.processed,
    required this.failed,
    this.results,
  });

  factory BulkActionResult.fromJson(Map<String, dynamic> json) {
    return BulkActionResult(
      processed: json['processed'] ?? 0,
      failed: json['failed'] ?? 0,
      results: json['results'],
    );
  }
}

/// Result of smart note creation with entity detection
class SmartNoteResult {
  final CrmNote? note;
  final List<DetectedEntity> detectedEntities;
  final bool autoLinked;
  final String? linkedEntityId;
  final String? linkedEntityType;

  SmartNoteResult({
    this.note,
    required this.detectedEntities,
    required this.autoLinked,
    this.linkedEntityId,
    this.linkedEntityType,
  });
}

/// A detected CRM entity from note content
class DetectedEntity {
  final String entityId;
  final String entityType;
  final String entityName;
  final double confidence;
  final String? matchedText;

  DetectedEntity({
    required this.entityId,
    required this.entityType,
    required this.entityName,
    required this.confidence,
    this.matchedText,
  });

  factory DetectedEntity.fromJson(Map<String, dynamic> json) {
    return DetectedEntity(
      entityId: json['entityId'] ?? json['id'] ?? '',
      entityType: json['entityType'] ?? json['type'] ?? '',
      entityName: json['entityName'] ?? json['name'] ?? '',
      confidence: (json['confidence'] ?? json['score'] ?? 0.5).toDouble(),
      matchedText: json['matchedText'] ?? json['match'],
    );
  }
}

/// Provider for SmartNotesService
final smartNotesServiceProvider = Provider<SmartNotesService>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  final captureService = ref.watch(smartCaptureServiceProvider);
  return SmartNotesService(apiClient, captureService);
});

/// Provider for user's notes - auto-disposes to ensure fresh data
final notesProvider = FutureProvider.autoDispose.family<List<CrmNote>, String?>((ref, search) async {
  final service = ref.watch(smartNotesServiceProvider);
  final notes = await service.getNotes(search: search);
  return notes;
});

/// Provider for entity-specific notes - auto-disposes to ensure fresh data
final entityNotesProvider = FutureProvider.autoDispose.family<List<CrmNote>, ({String entityId, String entityType})>((ref, params) async {
  final service = ref.watch(smartNotesServiceProvider);
  final notes = await service.getNotesForEntity(params.entityId, params.entityType);
  return notes;
});

