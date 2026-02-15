import 'dart:io';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import '../network/api_client.dart';

/// Capture modes for Smart Capture
enum CaptureMode {
  businessCard,
  document,
  handwritten,
  receipt,
}

/// CRM entity types for creating entities from captured data
enum CrmEntityType {
  lead,
  contact,
  account,
  note,
}

/// Result of a smart capture operation
class SmartCaptureResult {
  final bool success;
  final CaptureMode mode;
  final Map<String, dynamic> extractedData;
  final bool aiEnhanced;
  final CreatedEntity? createdEntity;
  final String? error;

  SmartCaptureResult({
    required this.success,
    required this.mode,
    required this.extractedData,
    this.aiEnhanced = false,
    this.createdEntity,
    this.error,
  });

  factory SmartCaptureResult.fromJson(Map<String, dynamic> json) {
    return SmartCaptureResult(
      success: json['success'] ?? false,
      mode: _parseCaptureMode(json['mode']),
      extractedData: json['extractedData'] ?? {},
      aiEnhanced: json['aiEnhanced'] ?? false,
      createdEntity: json['createdEntity'] != null
          ? CreatedEntity.fromJson(json['createdEntity'])
          : null,
      error: json['error'],
    );
  }

  static CaptureMode _parseCaptureMode(String? mode) {
    switch (mode) {
      case 'business_card':
        return CaptureMode.businessCard;
      case 'document':
        return CaptureMode.document;
      case 'handwritten':
        return CaptureMode.handwritten;
      case 'receipt':
        return CaptureMode.receipt;
      default:
        return CaptureMode.document;
    }
  }
}

/// Entity created from captured data
class CreatedEntity {
  final CrmEntityType type;
  final String id;
  final String? name;

  CreatedEntity({
    required this.type,
    required this.id,
    this.name,
  });

  factory CreatedEntity.fromJson(Map<String, dynamic> json) {
    return CreatedEntity(
      type: _parseEntityType(json['type']),
      id: json['id'] ?? '',
      name: json['name'],
    );
  }

  static CrmEntityType _parseEntityType(String? type) {
    switch (type) {
      case 'lead':
        return CrmEntityType.lead;
      case 'contact':
        return CrmEntityType.contact;
      case 'account':
        return CrmEntityType.account;
      case 'note':
        return CrmEntityType.note;
      default:
        return CrmEntityType.lead;
    }
  }
}

/// Extracted contact information from business card
class ExtractedContact {
  final String? firstName;
  final String? lastName;
  final String? fullName;
  final String? jobTitle;
  final String? company;
  final String? department;
  final String? email;
  final String? phone;
  final String? mobilePhone;
  final String? fax;
  final String? website;
  final String? address;
  final double? confidence;

  ExtractedContact({
    this.firstName,
    this.lastName,
    this.fullName,
    this.jobTitle,
    this.company,
    this.department,
    this.email,
    this.phone,
    this.mobilePhone,
    this.fax,
    this.website,
    this.address,
    this.confidence,
  });

  factory ExtractedContact.fromJson(Map<String, dynamic> json) {
    return ExtractedContact(
      firstName: json['firstName'],
      lastName: json['lastName'],
      fullName: json['fullName'],
      jobTitle: json['jobTitle'],
      company: json['company'],
      department: json['department'],
      email: json['email'],
      phone: json['phone'],
      mobilePhone: json['mobilePhone'],
      fax: json['fax'],
      website: json['website'],
      address: json['address'],
      confidence: json['confidence']?.toDouble(),
    );
  }

  Map<String, dynamic> toJson() => {
        'firstName': firstName,
        'lastName': lastName,
        'fullName': fullName,
        'jobTitle': jobTitle,
        'company': company,
        'department': department,
        'email': email,
        'phone': phone,
        'mobilePhone': mobilePhone,
        'fax': fax,
        'website': website,
        'address': address,
        'confidence': confidence,
      };

  bool get hasData =>
      firstName != null ||
      lastName != null ||
      email != null ||
      phone != null ||
      company != null;
}

/// OCR service capabilities
class OcrCapabilities {
  final bool available;
  final List<String> capabilities;

  OcrCapabilities({
    required this.available,
    required this.capabilities,
  });

  factory OcrCapabilities.fromJson(Map<String, dynamic> json) {
    return OcrCapabilities(
      available: json['available'] ?? false,
      capabilities: List<String>.from(json['capabilities'] ?? []),
    );
  }

  bool get hasBusinessCard => capabilities.contains('business_card');
  bool get hasHandwriting => capabilities.contains('handwriting');
  bool get hasReceipt => capabilities.contains('receipt');
}

/// Smart Capture Service for OCR and AI-powered data extraction
class SmartCaptureService {
  final ApiClient _apiClient;
  final ImagePicker _imagePicker = ImagePicker();

  SmartCaptureService(this._apiClient);

  /// Check OCR service availability and capabilities
  Future<OcrCapabilities> getCapabilities() async {
    try {
      final response = await _apiClient.get('/smart-capture/capabilities');
      return OcrCapabilities.fromJson(response.data);
    } catch (e) {
      return OcrCapabilities(available: false, capabilities: []);
    }
  }

  /// Capture image from camera
  Future<File?> captureFromCamera() async {
    try {
      final XFile? image = await _imagePicker.pickImage(
        source: ImageSource.camera,
        maxWidth: 2048,
        maxHeight: 2048,
        imageQuality: 90,
      );
      if (image != null) {
        return File(image.path);
      }
    } catch (e) {
      // Silently ignore
    }
    return null;
  }

  /// Pick image from gallery
  Future<File?> pickFromGallery() async {
    try {
      final XFile? image = await _imagePicker.pickImage(
        source: ImageSource.gallery,
        maxWidth: 2048,
        maxHeight: 2048,
        imageQuality: 90,
      );
      if (image != null) {
        return File(image.path);
      }
    } catch (e) {
      // Silently ignore
    }
    return null;
  }

  /// Process business card image
  Future<SmartCaptureResult> processBusinessCard(
    File imageFile, {
    bool autoCreate = false,
  }) async {
    try {
      final response = await _apiClient.uploadFile(
        '/smart-capture/business-card?autoCreate=$autoCreate',
        filePath: imageFile.path,
        fieldName: 'file',
      );
      return SmartCaptureResult.fromJson(response.data);
    } catch (e) {
      return SmartCaptureResult(
        success: false,
        mode: CaptureMode.businessCard,
        extractedData: {},
        error: e.toString(),
      );
    }
  }

  /// Process document image with OCR
  Future<SmartCaptureResult> processDocument(File imageFile) async {
    try {
      final response = await _apiClient.uploadFile(
        '/smart-capture/document',
        filePath: imageFile.path,
        fieldName: 'file',
      );
      return SmartCaptureResult.fromJson(response.data);
    } catch (e) {
      return SmartCaptureResult(
        success: false,
        mode: CaptureMode.document,
        extractedData: {},
        error: e.toString(),
      );
    }
  }

  /// Process handwritten notes
  Future<SmartCaptureResult> processHandwritten(
    File imageFile, {
    bool createNote = false,
    String? linkedEntityId,
    String? linkedEntityType,
    String? noteTitle,
  }) async {
    try {
      final response = await _apiClient.uploadFile(
        '/smart-capture/handwritten',
        filePath: imageFile.path,
        fieldName: 'file',
        data: {
          'createNote': createNote,
          'linkedEntityId': ?linkedEntityId,
          'linkedEntityType': ?linkedEntityType,
          'noteTitle': ?noteTitle,
        },
      );
      return SmartCaptureResult.fromJson(response.data);
    } catch (e) {
      return SmartCaptureResult(
        success: false,
        mode: CaptureMode.handwritten,
        extractedData: {},
        error: e.toString(),
      );
    }
  }

  /// Process receipt image
  Future<SmartCaptureResult> processReceipt(File imageFile) async {
    try {
      final response = await _apiClient.uploadFile(
        '/smart-capture/receipt',
        filePath: imageFile.path,
        fieldName: 'file',
      );
      return SmartCaptureResult.fromJson(response.data);
    } catch (e) {
      return SmartCaptureResult(
        success: false,
        mode: CaptureMode.receipt,
        extractedData: {},
        error: e.toString(),
      );
    }
  }

  /// Process image based on capture mode
  Future<SmartCaptureResult> processImage(
    File imageFile,
    CaptureMode mode, {
    bool autoCreate = false,
    String? linkedEntityId,
    String? linkedEntityType,
  }) async {
    switch (mode) {
      case CaptureMode.businessCard:
        return processBusinessCard(imageFile, autoCreate: autoCreate);
      case CaptureMode.document:
        return processDocument(imageFile);
      case CaptureMode.handwritten:
        return processHandwritten(
          imageFile,
          createNote: autoCreate,
          linkedEntityId: linkedEntityId,
          linkedEntityType: linkedEntityType,
        );
      case CaptureMode.receipt:
        return processReceipt(imageFile);
    }
  }

  /// Create CRM entity from extracted data
  Future<SmartCaptureResult> createEntityFromCapture({
    required CrmEntityType entityType,
    required Map<String, dynamic> extractedData,
    String? linkedEntityId,
    String? linkedEntityType,
    Map<String, dynamic>? additionalFields,
  }) async {
    try {
      final response = await _apiClient.post(
        '/smart-capture/create-entity',
        data: {
          'entityType': entityType.name,
          'extractedData': extractedData,
          'linkedEntityId': linkedEntityId,
          'linkedEntityType': linkedEntityType,
          'additionalFields': additionalFields,
        },
      );
      return SmartCaptureResult.fromJson(response.data);
    } catch (e) {
      return SmartCaptureResult(
        success: false,
        mode: CaptureMode.document,
        extractedData: extractedData,
        error: e.toString(),
      );
    }
  }
}

/// Provider for SmartCaptureService
final smartCaptureServiceProvider = Provider<SmartCaptureService>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  return SmartCaptureService(apiClient);
});

/// Provider for OCR capabilities
final ocrCapabilitiesProvider = FutureProvider<OcrCapabilities>((ref) async {
  final service = ref.watch(smartCaptureServiceProvider);
  return service.getCapabilities();
});
