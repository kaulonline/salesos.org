// ignore_for_file: constant_identifier_names
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client.dart';
import '../../../core/providers/auth_mode_provider.dart';

/// Approval type enum - UPPERCASE to match web conventions
enum ApprovalType {
  QUOTE('Quote', 'QUOTE'),
  DISCOUNT('Discount', 'DISCOUNT'),
  ORDER('Order', 'ORDER'),
  CONTRACT('Contract', 'CONTRACT'),
  EXPENSE('Expense', 'EXPENSE'),
  OTHER('Other', 'OTHER');

  final String label;
  final String backendValue;
  const ApprovalType(this.label, this.backendValue);

  static ApprovalType fromString(String? type) {
    if (type == null) return ApprovalType.OTHER;
    final normalized = type.toUpperCase().replaceAll(' ', '').replaceAll('_', '');
    switch (normalized) {
      case 'QUOTE':
        return ApprovalType.QUOTE;
      case 'DISCOUNT':
        return ApprovalType.DISCOUNT;
      case 'ORDER':
        return ApprovalType.ORDER;
      case 'CONTRACT':
        return ApprovalType.CONTRACT;
      case 'EXPENSE':
        return ApprovalType.EXPENSE;
      default:
        return ApprovalType.OTHER;
    }
  }
}

/// Approval status enum - UPPERCASE to match web conventions
enum ApprovalStatus {
  PENDING('Pending', 'PENDING'),
  APPROVED('Approved', 'APPROVED'),
  REJECTED('Rejected', 'REJECTED');

  final String label;
  final String backendValue;
  const ApprovalStatus(this.label, this.backendValue);

  static ApprovalStatus fromString(String? status) {
    if (status == null) return ApprovalStatus.PENDING;
    final normalized = status.toUpperCase().replaceAll(' ', '').replaceAll('_', '');
    switch (normalized) {
      case 'PENDING':
      case 'SUBMITTED':
        return ApprovalStatus.PENDING;
      case 'APPROVED':
        return ApprovalStatus.APPROVED;
      case 'REJECTED':
      case 'DENIED':
        return ApprovalStatus.REJECTED;
      default:
        return ApprovalStatus.PENDING;
    }
  }
}

/// Approval model
class ApprovalModel {
  final String id;
  final ApprovalType type;
  final String? requesterId;
  final String requesterName;
  final String? entityType;
  final String? entityId;
  final String? entityName;
  final ApprovalStatus status;
  final double? amount;
  final String? description;
  final DateTime createdAt;

  ApprovalModel({
    required this.id,
    required this.type,
    this.requesterId,
    required this.requesterName,
    this.entityType,
    this.entityId,
    this.entityName,
    required this.status,
    this.amount,
    this.description,
    required this.createdAt,
  });

  factory ApprovalModel.fromJson(Map<String, dynamic> json) {
    final id = json['id'] as String? ?? json['Id'] as String? ?? '';
    // Backward compat: accept both web 'type' and old mobile 'approvalType'
    final type = json['type'] as String? ?? json['approvalType'] as String?;
    final requesterName = json['requesterName'] as String? ??
        json['requester']?['name'] as String? ??
        json['submittedBy'] as String? ??
        'Unknown';
    final status = json['status'] as String? ?? json['Status'] as String?;
    final amount = (json['amount'] as num?)?.toDouble() ??
        (json['totalAmount'] as num?)?.toDouble();
    final createdAt = json['createdAt'] as String? ??
        json['submittedAt'] as String? ??
        json['CreatedDate'] as String?;

    return ApprovalModel(
      id: id,
      type: ApprovalType.fromString(type),
      requesterId: json['requesterId'] as String? ??
          json['submittedById'] as String?,
      requesterName: requesterName,
      entityType: json['entityType'] as String? ??
          json['relatedObjectType'] as String?,
      entityId: json['entityId'] as String? ??
          json['relatedObjectId'] as String?,
      entityName: json['entityName'] as String? ??
          json['relatedObjectName'] as String? ??
          json['name'] as String?,
      status: ApprovalStatus.fromString(status),
      amount: amount,
      description: json['description'] as String? ??
          json['notes'] as String? ??
          json['reason'] as String?,
      createdAt:
          createdAt != null ? DateTime.parse(createdAt) : DateTime.now(),
    );
  }

  /// toJson emits web-compatible field names
  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'type': type.backendValue,
      'requesterId': requesterId,
      'requesterName': requesterName,
      'entityType': entityType,
      'entityId': entityId,
      'entityName': entityName,
      'status': status.backendValue,
      'amount': amount,
      'description': description,
      'createdAt': createdAt.toIso8601String(),
    };
  }
}

/// Approvals service provider
final approvalsServiceProvider = Provider<ApprovalsService>((ref) {
  final api = ref.watch(apiClientProvider);
  final authMode = ref.watch(authModeProvider);
  return ApprovalsService(api, authMode);
});

/// Pending approvals provider
final pendingApprovalsProvider =
    FutureProvider.autoDispose<List<ApprovalModel>>((ref) async {
  ref.watch(authModeProvider);
  final service = ref.watch(approvalsServiceProvider);
  return service.getPending();
});

/// Service for approval workflows
class ApprovalsService {
  final ApiClient _api;
  final AuthMode _authMode;

  ApprovalsService(this._api, this._authMode);

  bool get isSalesforceMode => _authMode == AuthMode.salesforce;

  /// Get pending approvals
  Future<List<ApprovalModel>> getPending() async {
    try {
      final response = await _api.get('/approvals/pending');
      final data = response.data;

      List<dynamic> items = [];
      if (data is List) {
        items = data;
      } else if (data is Map && data['data'] is List) {
        items = data['data'] as List;
      } else if (data is Map && data['items'] is List) {
        items = data['items'] as List;
      } else if (data is Map && data['approvals'] is List) {
        items = data['approvals'] as List;
      }

      return items
          .map((item) =>
              ApprovalModel.fromJson(item as Map<String, dynamic>))
          .toList()
        ..sort((a, b) => b.createdAt.compareTo(a.createdAt));
    } catch (e) {
      return [];
    }
  }

  /// Approve an approval request
  Future<bool> approve(String id, {String? comment}) async {
    try {
      await _api.post('/approvals/$id/approve', data: {
        'comment': ?comment,
      });
      return true;
    } catch (e) {
      return false;
    }
  }

  /// Reject an approval request
  Future<bool> reject(String id, {String? comment}) async {
    try {
      await _api.post('/approvals/$id/reject', data: {
        'comment': ?comment,
      });
      return true;
    } catch (e) {
      return false;
    }
  }
}
