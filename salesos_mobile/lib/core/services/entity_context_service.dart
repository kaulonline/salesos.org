import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Types of entities that can provide context
enum EntityType {
  lead,
  contact,
  account,
  opportunity,
  task,
  activity,
}

/// Represents the current entity context for pre-filling related forms
class EntityContext {
  final EntityType type;
  final String id;
  final String? name;
  final Map<String, dynamic> data;
  final DateTime timestamp;

  EntityContext({
    required this.type,
    required this.id,
    this.name,
    this.data = const {},
    DateTime? timestamp,
  }) : timestamp = timestamp ?? DateTime.now();

  /// Create context from a Lead
  factory EntityContext.fromLead(Map<String, dynamic> lead) {
    final id = lead['id'] as String? ?? lead['Id'] as String? ?? '';
    final firstName = lead['firstName'] as String? ?? lead['FirstName'] as String? ?? '';
    final lastName = lead['lastName'] as String? ?? lead['LastName'] as String? ?? '';
    final name = '$firstName $lastName'.trim();

    return EntityContext(
      type: EntityType.lead,
      id: id,
      name: name.isNotEmpty ? name : 'Unknown Lead',
      data: lead,
    );
  }

  /// Create context from a Contact
  factory EntityContext.fromContact(Map<String, dynamic> contact) {
    final id = contact['id'] as String? ?? contact['Id'] as String? ?? '';
    final firstName = contact['firstName'] as String? ?? contact['FirstName'] as String? ?? '';
    final lastName = contact['lastName'] as String? ?? contact['LastName'] as String? ?? '';
    final name = '$firstName $lastName'.trim();

    return EntityContext(
      type: EntityType.contact,
      id: id,
      name: name.isNotEmpty ? name : 'Unknown Contact',
      data: contact,
    );
  }

  /// Create context from an Account
  factory EntityContext.fromAccount(Map<String, dynamic> account) {
    final id = account['id'] as String? ?? account['Id'] as String? ?? '';
    final name = account['name'] as String? ?? account['Name'] as String? ?? 'Unknown Account';

    return EntityContext(
      type: EntityType.account,
      id: id,
      name: name,
      data: account,
    );
  }

  /// Create context from an Opportunity/Deal
  factory EntityContext.fromOpportunity(Map<String, dynamic> opportunity) {
    final id = opportunity['id'] as String? ?? opportunity['Id'] as String? ?? '';
    final name = opportunity['name'] as String? ?? opportunity['Name'] as String? ?? 'Unknown Deal';

    return EntityContext(
      type: EntityType.opportunity,
      id: id,
      name: name,
      data: opportunity,
    );
  }

  /// Get pre-fill data for creating a Contact from this context
  Map<String, dynamic> getContactPrefill() {
    switch (type) {
      case EntityType.lead:
        // Converting lead to contact - transfer all relevant data
        return {
          'firstName': data['firstName'] ?? data['FirstName'] ?? '',
          'lastName': data['lastName'] ?? data['LastName'] ?? '',
          'email': data['email'] ?? data['Email'] ?? '',
          'phone': data['phone'] ?? data['Phone'] ?? '',
          'mobilePhone': data['mobilePhone'] ?? data['MobilePhone'] ?? '',
          'title': data['title'] ?? data['Title'] ?? '',
          'department': data['department'] ?? data['Department'] ?? '',
          'mailingStreet': data['street'] ?? data['Street'] ?? '',
          'mailingCity': data['city'] ?? data['City'] ?? '',
          'mailingState': data['state'] ?? data['State'] ?? '',
          'mailingPostalCode': data['postalCode'] ?? data['PostalCode'] ?? '',
          'mailingCountry': data['country'] ?? data['Country'] ?? '',
          'description': data['description'] ?? data['Description'] ?? '',
          // Store lead source for reference
          '_convertedFromLead': id,
          '_leadCompany': data['company'] ?? data['Company'] ?? '',
        };
      case EntityType.account:
        // Creating contact for an account - link the account
        return {
          'accountId': id,
          '_accountName': name,
          'mailingStreet': data['billingStreet'] ?? data['BillingStreet'] ?? '',
          'mailingCity': data['billingCity'] ?? data['BillingCity'] ?? '',
          'mailingState': data['billingState'] ?? data['BillingState'] ?? '',
          'mailingPostalCode': data['billingPostalCode'] ?? data['BillingPostalCode'] ?? '',
          'mailingCountry': data['billingCountry'] ?? data['BillingCountry'] ?? '',
          'phone': data['phone'] ?? data['Phone'] ?? '',
        };
      default:
        return {};
    }
  }

  /// Get pre-fill data for creating an Opportunity from this context
  Map<String, dynamic> getOpportunityPrefill() {
    switch (type) {
      case EntityType.lead:
        // Creating opportunity from lead
        return {
          '_leadName': name,
          '_leadCompany': data['company'] ?? data['Company'] ?? '',
          'description': 'Opportunity from lead: $name',
        };
      case EntityType.account:
        // Creating opportunity for account
        return {
          'accountId': id,
          '_accountName': name,
          'name': 'New Opportunity - $name',
        };
      case EntityType.contact:
        // Creating opportunity related to contact
        final accountId = data['accountId'] ?? data['AccountId'] ?? '';
        final accountName = data['account']?['name'] ?? data['Account']?['Name'] ?? '';
        return {
          'accountId': accountId,
          '_accountName': accountName,
          '_contactId': id,
          '_contactName': name,
        };
      default:
        return {};
    }
  }

  /// Get pre-fill data for creating a Task from this context
  Map<String, dynamic> getTaskPrefill() {
    switch (type) {
      case EntityType.lead:
        return {
          'whatId': id,
          '_relatedToType': 'Lead',
          '_relatedToName': name,
          'subject': 'Follow up with $name',
        };
      case EntityType.contact:
        return {
          'whoId': id,
          '_relatedToType': 'Contact',
          '_relatedToName': name,
          'subject': 'Follow up with $name',
        };
      case EntityType.account:
        return {
          'whatId': id,
          '_relatedToType': 'Account',
          '_relatedToName': name,
          'subject': 'Task for $name',
        };
      case EntityType.opportunity:
        return {
          'whatId': id,
          '_relatedToType': 'Opportunity',
          '_relatedToName': name,
          'subject': 'Task for deal: $name',
        };
      default:
        return {};
    }
  }

  /// Get pre-fill data for logging an Activity from this context
  Map<String, dynamic> getActivityPrefill() {
    switch (type) {
      case EntityType.lead:
        return {
          'whoId': id,
          '_relatedToType': 'Lead',
          '_relatedToName': name,
        };
      case EntityType.contact:
        return {
          'whoId': id,
          '_relatedToType': 'Contact',
          '_relatedToName': name,
        };
      case EntityType.account:
        return {
          'whatId': id,
          '_relatedToType': 'Account',
          '_relatedToName': name,
        };
      case EntityType.opportunity:
        return {
          'whatId': id,
          '_relatedToType': 'Opportunity',
          '_relatedToName': name,
        };
      default:
        return {};
    }
  }
}

/// Service for managing entity context across the app
class EntityContextNotifier extends Notifier<EntityContext?> {
  @override
  EntityContext? build() => null;

  /// Set the current entity context
  void setContext(EntityContext context) {
    state = context;
  }

  /// Clear the current context
  void clearContext() {
    state = null;
  }

  /// Set context from a Lead
  void setLeadContext(Map<String, dynamic> lead) {
    state = EntityContext.fromLead(lead);
  }

  /// Set context from a Contact
  void setContactContext(Map<String, dynamic> contact) {
    state = EntityContext.fromContact(contact);
  }

  /// Set context from an Account
  void setAccountContext(Map<String, dynamic> account) {
    state = EntityContext.fromAccount(account);
  }

  /// Set context from an Opportunity
  void setOpportunityContext(Map<String, dynamic> opportunity) {
    state = EntityContext.fromOpportunity(opportunity);
  }

  /// Get pre-fill data for a specific entity type
  Map<String, dynamic> getPrefillFor(EntityType targetType) {
    if (state == null) return {};

    switch (targetType) {
      case EntityType.contact:
        return state!.getContactPrefill();
      case EntityType.opportunity:
        return state!.getOpportunityPrefill();
      case EntityType.task:
        return state!.getTaskPrefill();
      case EntityType.activity:
        return state!.getActivityPrefill();
      default:
        return {};
    }
  }
}

/// Provider for the entity context service
final entityContextProvider = NotifierProvider<EntityContextNotifier, EntityContext?>(() {
  return EntityContextNotifier();
});
