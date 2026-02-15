// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'organization.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$Organization {

 String get id; String get name; String get slug; String? get code; String? get domain; String? get contactEmail; String? get contactPhone; String? get logoUrl; OrganizationStatus get status; int? get maxMembers; DateTime? get createdAt; DateTime? get updatedAt;// Counts
 int? get memberCount; int? get licenseCount; int? get codeCount;
/// Create a copy of Organization
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$OrganizationCopyWith<Organization> get copyWith => _$OrganizationCopyWithImpl<Organization>(this as Organization, _$identity);

  /// Serializes this Organization to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is Organization&&(identical(other.id, id) || other.id == id)&&(identical(other.name, name) || other.name == name)&&(identical(other.slug, slug) || other.slug == slug)&&(identical(other.code, code) || other.code == code)&&(identical(other.domain, domain) || other.domain == domain)&&(identical(other.contactEmail, contactEmail) || other.contactEmail == contactEmail)&&(identical(other.contactPhone, contactPhone) || other.contactPhone == contactPhone)&&(identical(other.logoUrl, logoUrl) || other.logoUrl == logoUrl)&&(identical(other.status, status) || other.status == status)&&(identical(other.maxMembers, maxMembers) || other.maxMembers == maxMembers)&&(identical(other.createdAt, createdAt) || other.createdAt == createdAt)&&(identical(other.updatedAt, updatedAt) || other.updatedAt == updatedAt)&&(identical(other.memberCount, memberCount) || other.memberCount == memberCount)&&(identical(other.licenseCount, licenseCount) || other.licenseCount == licenseCount)&&(identical(other.codeCount, codeCount) || other.codeCount == codeCount));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,name,slug,code,domain,contactEmail,contactPhone,logoUrl,status,maxMembers,createdAt,updatedAt,memberCount,licenseCount,codeCount);

@override
String toString() {
  return 'Organization(id: $id, name: $name, slug: $slug, code: $code, domain: $domain, contactEmail: $contactEmail, contactPhone: $contactPhone, logoUrl: $logoUrl, status: $status, maxMembers: $maxMembers, createdAt: $createdAt, updatedAt: $updatedAt, memberCount: $memberCount, licenseCount: $licenseCount, codeCount: $codeCount)';
}


}

/// @nodoc
abstract mixin class $OrganizationCopyWith<$Res>  {
  factory $OrganizationCopyWith(Organization value, $Res Function(Organization) _then) = _$OrganizationCopyWithImpl;
@useResult
$Res call({
 String id, String name, String slug, String? code, String? domain, String? contactEmail, String? contactPhone, String? logoUrl, OrganizationStatus status, int? maxMembers, DateTime? createdAt, DateTime? updatedAt, int? memberCount, int? licenseCount, int? codeCount
});




}
/// @nodoc
class _$OrganizationCopyWithImpl<$Res>
    implements $OrganizationCopyWith<$Res> {
  _$OrganizationCopyWithImpl(this._self, this._then);

  final Organization _self;
  final $Res Function(Organization) _then;

/// Create a copy of Organization
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? name = null,Object? slug = null,Object? code = freezed,Object? domain = freezed,Object? contactEmail = freezed,Object? contactPhone = freezed,Object? logoUrl = freezed,Object? status = null,Object? maxMembers = freezed,Object? createdAt = freezed,Object? updatedAt = freezed,Object? memberCount = freezed,Object? licenseCount = freezed,Object? codeCount = freezed,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,slug: null == slug ? _self.slug : slug // ignore: cast_nullable_to_non_nullable
as String,code: freezed == code ? _self.code : code // ignore: cast_nullable_to_non_nullable
as String?,domain: freezed == domain ? _self.domain : domain // ignore: cast_nullable_to_non_nullable
as String?,contactEmail: freezed == contactEmail ? _self.contactEmail : contactEmail // ignore: cast_nullable_to_non_nullable
as String?,contactPhone: freezed == contactPhone ? _self.contactPhone : contactPhone // ignore: cast_nullable_to_non_nullable
as String?,logoUrl: freezed == logoUrl ? _self.logoUrl : logoUrl // ignore: cast_nullable_to_non_nullable
as String?,status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as OrganizationStatus,maxMembers: freezed == maxMembers ? _self.maxMembers : maxMembers // ignore: cast_nullable_to_non_nullable
as int?,createdAt: freezed == createdAt ? _self.createdAt : createdAt // ignore: cast_nullable_to_non_nullable
as DateTime?,updatedAt: freezed == updatedAt ? _self.updatedAt : updatedAt // ignore: cast_nullable_to_non_nullable
as DateTime?,memberCount: freezed == memberCount ? _self.memberCount : memberCount // ignore: cast_nullable_to_non_nullable
as int?,licenseCount: freezed == licenseCount ? _self.licenseCount : licenseCount // ignore: cast_nullable_to_non_nullable
as int?,codeCount: freezed == codeCount ? _self.codeCount : codeCount // ignore: cast_nullable_to_non_nullable
as int?,
  ));
}

}


/// Adds pattern-matching-related methods to [Organization].
extension OrganizationPatterns on Organization {
/// A variant of `map` that fallback to returning `orElse`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _Organization value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _Organization() when $default != null:
return $default(_that);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// Callbacks receives the raw object, upcasted.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case final Subclass2 value:
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _Organization value)  $default,){
final _that = this;
switch (_that) {
case _Organization():
return $default(_that);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `map` that fallback to returning `null`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _Organization value)?  $default,){
final _that = this;
switch (_that) {
case _Organization() when $default != null:
return $default(_that);case _:
  return null;

}
}
/// A variant of `when` that fallback to an `orElse` callback.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String name,  String slug,  String? code,  String? domain,  String? contactEmail,  String? contactPhone,  String? logoUrl,  OrganizationStatus status,  int? maxMembers,  DateTime? createdAt,  DateTime? updatedAt,  int? memberCount,  int? licenseCount,  int? codeCount)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _Organization() when $default != null:
return $default(_that.id,_that.name,_that.slug,_that.code,_that.domain,_that.contactEmail,_that.contactPhone,_that.logoUrl,_that.status,_that.maxMembers,_that.createdAt,_that.updatedAt,_that.memberCount,_that.licenseCount,_that.codeCount);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// As opposed to `map`, this offers destructuring.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case Subclass2(:final field2):
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String name,  String slug,  String? code,  String? domain,  String? contactEmail,  String? contactPhone,  String? logoUrl,  OrganizationStatus status,  int? maxMembers,  DateTime? createdAt,  DateTime? updatedAt,  int? memberCount,  int? licenseCount,  int? codeCount)  $default,) {final _that = this;
switch (_that) {
case _Organization():
return $default(_that.id,_that.name,_that.slug,_that.code,_that.domain,_that.contactEmail,_that.contactPhone,_that.logoUrl,_that.status,_that.maxMembers,_that.createdAt,_that.updatedAt,_that.memberCount,_that.licenseCount,_that.codeCount);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `when` that fallback to returning `null`
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String name,  String slug,  String? code,  String? domain,  String? contactEmail,  String? contactPhone,  String? logoUrl,  OrganizationStatus status,  int? maxMembers,  DateTime? createdAt,  DateTime? updatedAt,  int? memberCount,  int? licenseCount,  int? codeCount)?  $default,) {final _that = this;
switch (_that) {
case _Organization() when $default != null:
return $default(_that.id,_that.name,_that.slug,_that.code,_that.domain,_that.contactEmail,_that.contactPhone,_that.logoUrl,_that.status,_that.maxMembers,_that.createdAt,_that.updatedAt,_that.memberCount,_that.licenseCount,_that.codeCount);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _Organization extends Organization {
  const _Organization({required this.id, required this.name, required this.slug, this.code, this.domain, this.contactEmail, this.contactPhone, this.logoUrl, this.status = OrganizationStatus.pending, this.maxMembers, this.createdAt, this.updatedAt, this.memberCount, this.licenseCount, this.codeCount}): super._();
  factory _Organization.fromJson(Map<String, dynamic> json) => _$OrganizationFromJson(json);

@override final  String id;
@override final  String name;
@override final  String slug;
@override final  String? code;
@override final  String? domain;
@override final  String? contactEmail;
@override final  String? contactPhone;
@override final  String? logoUrl;
@override@JsonKey() final  OrganizationStatus status;
@override final  int? maxMembers;
@override final  DateTime? createdAt;
@override final  DateTime? updatedAt;
// Counts
@override final  int? memberCount;
@override final  int? licenseCount;
@override final  int? codeCount;

/// Create a copy of Organization
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$OrganizationCopyWith<_Organization> get copyWith => __$OrganizationCopyWithImpl<_Organization>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$OrganizationToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _Organization&&(identical(other.id, id) || other.id == id)&&(identical(other.name, name) || other.name == name)&&(identical(other.slug, slug) || other.slug == slug)&&(identical(other.code, code) || other.code == code)&&(identical(other.domain, domain) || other.domain == domain)&&(identical(other.contactEmail, contactEmail) || other.contactEmail == contactEmail)&&(identical(other.contactPhone, contactPhone) || other.contactPhone == contactPhone)&&(identical(other.logoUrl, logoUrl) || other.logoUrl == logoUrl)&&(identical(other.status, status) || other.status == status)&&(identical(other.maxMembers, maxMembers) || other.maxMembers == maxMembers)&&(identical(other.createdAt, createdAt) || other.createdAt == createdAt)&&(identical(other.updatedAt, updatedAt) || other.updatedAt == updatedAt)&&(identical(other.memberCount, memberCount) || other.memberCount == memberCount)&&(identical(other.licenseCount, licenseCount) || other.licenseCount == licenseCount)&&(identical(other.codeCount, codeCount) || other.codeCount == codeCount));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,name,slug,code,domain,contactEmail,contactPhone,logoUrl,status,maxMembers,createdAt,updatedAt,memberCount,licenseCount,codeCount);

@override
String toString() {
  return 'Organization(id: $id, name: $name, slug: $slug, code: $code, domain: $domain, contactEmail: $contactEmail, contactPhone: $contactPhone, logoUrl: $logoUrl, status: $status, maxMembers: $maxMembers, createdAt: $createdAt, updatedAt: $updatedAt, memberCount: $memberCount, licenseCount: $licenseCount, codeCount: $codeCount)';
}


}

/// @nodoc
abstract mixin class _$OrganizationCopyWith<$Res> implements $OrganizationCopyWith<$Res> {
  factory _$OrganizationCopyWith(_Organization value, $Res Function(_Organization) _then) = __$OrganizationCopyWithImpl;
@override @useResult
$Res call({
 String id, String name, String slug, String? code, String? domain, String? contactEmail, String? contactPhone, String? logoUrl, OrganizationStatus status, int? maxMembers, DateTime? createdAt, DateTime? updatedAt, int? memberCount, int? licenseCount, int? codeCount
});




}
/// @nodoc
class __$OrganizationCopyWithImpl<$Res>
    implements _$OrganizationCopyWith<$Res> {
  __$OrganizationCopyWithImpl(this._self, this._then);

  final _Organization _self;
  final $Res Function(_Organization) _then;

/// Create a copy of Organization
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? name = null,Object? slug = null,Object? code = freezed,Object? domain = freezed,Object? contactEmail = freezed,Object? contactPhone = freezed,Object? logoUrl = freezed,Object? status = null,Object? maxMembers = freezed,Object? createdAt = freezed,Object? updatedAt = freezed,Object? memberCount = freezed,Object? licenseCount = freezed,Object? codeCount = freezed,}) {
  return _then(_Organization(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,slug: null == slug ? _self.slug : slug // ignore: cast_nullable_to_non_nullable
as String,code: freezed == code ? _self.code : code // ignore: cast_nullable_to_non_nullable
as String?,domain: freezed == domain ? _self.domain : domain // ignore: cast_nullable_to_non_nullable
as String?,contactEmail: freezed == contactEmail ? _self.contactEmail : contactEmail // ignore: cast_nullable_to_non_nullable
as String?,contactPhone: freezed == contactPhone ? _self.contactPhone : contactPhone // ignore: cast_nullable_to_non_nullable
as String?,logoUrl: freezed == logoUrl ? _self.logoUrl : logoUrl // ignore: cast_nullable_to_non_nullable
as String?,status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as OrganizationStatus,maxMembers: freezed == maxMembers ? _self.maxMembers : maxMembers // ignore: cast_nullable_to_non_nullable
as int?,createdAt: freezed == createdAt ? _self.createdAt : createdAt // ignore: cast_nullable_to_non_nullable
as DateTime?,updatedAt: freezed == updatedAt ? _self.updatedAt : updatedAt // ignore: cast_nullable_to_non_nullable
as DateTime?,memberCount: freezed == memberCount ? _self.memberCount : memberCount // ignore: cast_nullable_to_non_nullable
as int?,licenseCount: freezed == licenseCount ? _self.licenseCount : licenseCount // ignore: cast_nullable_to_non_nullable
as int?,codeCount: freezed == codeCount ? _self.codeCount : codeCount // ignore: cast_nullable_to_non_nullable
as int?,
  ));
}


}


/// @nodoc
mixin _$OrganizationMember {

 String get id; String get userId; String get organizationId; OrganizationMemberRole get role; bool get isActive; DateTime? get joinedAt; String? get department; String? get title;// User info
 String? get userName; String? get userEmail; String? get userAvatarUrl;
/// Create a copy of OrganizationMember
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$OrganizationMemberCopyWith<OrganizationMember> get copyWith => _$OrganizationMemberCopyWithImpl<OrganizationMember>(this as OrganizationMember, _$identity);

  /// Serializes this OrganizationMember to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is OrganizationMember&&(identical(other.id, id) || other.id == id)&&(identical(other.userId, userId) || other.userId == userId)&&(identical(other.organizationId, organizationId) || other.organizationId == organizationId)&&(identical(other.role, role) || other.role == role)&&(identical(other.isActive, isActive) || other.isActive == isActive)&&(identical(other.joinedAt, joinedAt) || other.joinedAt == joinedAt)&&(identical(other.department, department) || other.department == department)&&(identical(other.title, title) || other.title == title)&&(identical(other.userName, userName) || other.userName == userName)&&(identical(other.userEmail, userEmail) || other.userEmail == userEmail)&&(identical(other.userAvatarUrl, userAvatarUrl) || other.userAvatarUrl == userAvatarUrl));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,userId,organizationId,role,isActive,joinedAt,department,title,userName,userEmail,userAvatarUrl);

@override
String toString() {
  return 'OrganizationMember(id: $id, userId: $userId, organizationId: $organizationId, role: $role, isActive: $isActive, joinedAt: $joinedAt, department: $department, title: $title, userName: $userName, userEmail: $userEmail, userAvatarUrl: $userAvatarUrl)';
}


}

/// @nodoc
abstract mixin class $OrganizationMemberCopyWith<$Res>  {
  factory $OrganizationMemberCopyWith(OrganizationMember value, $Res Function(OrganizationMember) _then) = _$OrganizationMemberCopyWithImpl;
@useResult
$Res call({
 String id, String userId, String organizationId, OrganizationMemberRole role, bool isActive, DateTime? joinedAt, String? department, String? title, String? userName, String? userEmail, String? userAvatarUrl
});




}
/// @nodoc
class _$OrganizationMemberCopyWithImpl<$Res>
    implements $OrganizationMemberCopyWith<$Res> {
  _$OrganizationMemberCopyWithImpl(this._self, this._then);

  final OrganizationMember _self;
  final $Res Function(OrganizationMember) _then;

/// Create a copy of OrganizationMember
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? userId = null,Object? organizationId = null,Object? role = null,Object? isActive = null,Object? joinedAt = freezed,Object? department = freezed,Object? title = freezed,Object? userName = freezed,Object? userEmail = freezed,Object? userAvatarUrl = freezed,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,userId: null == userId ? _self.userId : userId // ignore: cast_nullable_to_non_nullable
as String,organizationId: null == organizationId ? _self.organizationId : organizationId // ignore: cast_nullable_to_non_nullable
as String,role: null == role ? _self.role : role // ignore: cast_nullable_to_non_nullable
as OrganizationMemberRole,isActive: null == isActive ? _self.isActive : isActive // ignore: cast_nullable_to_non_nullable
as bool,joinedAt: freezed == joinedAt ? _self.joinedAt : joinedAt // ignore: cast_nullable_to_non_nullable
as DateTime?,department: freezed == department ? _self.department : department // ignore: cast_nullable_to_non_nullable
as String?,title: freezed == title ? _self.title : title // ignore: cast_nullable_to_non_nullable
as String?,userName: freezed == userName ? _self.userName : userName // ignore: cast_nullable_to_non_nullable
as String?,userEmail: freezed == userEmail ? _self.userEmail : userEmail // ignore: cast_nullable_to_non_nullable
as String?,userAvatarUrl: freezed == userAvatarUrl ? _self.userAvatarUrl : userAvatarUrl // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}

}


/// Adds pattern-matching-related methods to [OrganizationMember].
extension OrganizationMemberPatterns on OrganizationMember {
/// A variant of `map` that fallback to returning `orElse`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _OrganizationMember value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _OrganizationMember() when $default != null:
return $default(_that);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// Callbacks receives the raw object, upcasted.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case final Subclass2 value:
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _OrganizationMember value)  $default,){
final _that = this;
switch (_that) {
case _OrganizationMember():
return $default(_that);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `map` that fallback to returning `null`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _OrganizationMember value)?  $default,){
final _that = this;
switch (_that) {
case _OrganizationMember() when $default != null:
return $default(_that);case _:
  return null;

}
}
/// A variant of `when` that fallback to an `orElse` callback.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String userId,  String organizationId,  OrganizationMemberRole role,  bool isActive,  DateTime? joinedAt,  String? department,  String? title,  String? userName,  String? userEmail,  String? userAvatarUrl)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _OrganizationMember() when $default != null:
return $default(_that.id,_that.userId,_that.organizationId,_that.role,_that.isActive,_that.joinedAt,_that.department,_that.title,_that.userName,_that.userEmail,_that.userAvatarUrl);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// As opposed to `map`, this offers destructuring.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case Subclass2(:final field2):
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String userId,  String organizationId,  OrganizationMemberRole role,  bool isActive,  DateTime? joinedAt,  String? department,  String? title,  String? userName,  String? userEmail,  String? userAvatarUrl)  $default,) {final _that = this;
switch (_that) {
case _OrganizationMember():
return $default(_that.id,_that.userId,_that.organizationId,_that.role,_that.isActive,_that.joinedAt,_that.department,_that.title,_that.userName,_that.userEmail,_that.userAvatarUrl);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `when` that fallback to returning `null`
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String userId,  String organizationId,  OrganizationMemberRole role,  bool isActive,  DateTime? joinedAt,  String? department,  String? title,  String? userName,  String? userEmail,  String? userAvatarUrl)?  $default,) {final _that = this;
switch (_that) {
case _OrganizationMember() when $default != null:
return $default(_that.id,_that.userId,_that.organizationId,_that.role,_that.isActive,_that.joinedAt,_that.department,_that.title,_that.userName,_that.userEmail,_that.userAvatarUrl);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _OrganizationMember extends OrganizationMember {
  const _OrganizationMember({required this.id, required this.userId, required this.organizationId, this.role = OrganizationMemberRole.member, this.isActive = true, this.joinedAt, this.department, this.title, this.userName, this.userEmail, this.userAvatarUrl}): super._();
  factory _OrganizationMember.fromJson(Map<String, dynamic> json) => _$OrganizationMemberFromJson(json);

@override final  String id;
@override final  String userId;
@override final  String organizationId;
@override@JsonKey() final  OrganizationMemberRole role;
@override@JsonKey() final  bool isActive;
@override final  DateTime? joinedAt;
@override final  String? department;
@override final  String? title;
// User info
@override final  String? userName;
@override final  String? userEmail;
@override final  String? userAvatarUrl;

/// Create a copy of OrganizationMember
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$OrganizationMemberCopyWith<_OrganizationMember> get copyWith => __$OrganizationMemberCopyWithImpl<_OrganizationMember>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$OrganizationMemberToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _OrganizationMember&&(identical(other.id, id) || other.id == id)&&(identical(other.userId, userId) || other.userId == userId)&&(identical(other.organizationId, organizationId) || other.organizationId == organizationId)&&(identical(other.role, role) || other.role == role)&&(identical(other.isActive, isActive) || other.isActive == isActive)&&(identical(other.joinedAt, joinedAt) || other.joinedAt == joinedAt)&&(identical(other.department, department) || other.department == department)&&(identical(other.title, title) || other.title == title)&&(identical(other.userName, userName) || other.userName == userName)&&(identical(other.userEmail, userEmail) || other.userEmail == userEmail)&&(identical(other.userAvatarUrl, userAvatarUrl) || other.userAvatarUrl == userAvatarUrl));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,userId,organizationId,role,isActive,joinedAt,department,title,userName,userEmail,userAvatarUrl);

@override
String toString() {
  return 'OrganizationMember(id: $id, userId: $userId, organizationId: $organizationId, role: $role, isActive: $isActive, joinedAt: $joinedAt, department: $department, title: $title, userName: $userName, userEmail: $userEmail, userAvatarUrl: $userAvatarUrl)';
}


}

/// @nodoc
abstract mixin class _$OrganizationMemberCopyWith<$Res> implements $OrganizationMemberCopyWith<$Res> {
  factory _$OrganizationMemberCopyWith(_OrganizationMember value, $Res Function(_OrganizationMember) _then) = __$OrganizationMemberCopyWithImpl;
@override @useResult
$Res call({
 String id, String userId, String organizationId, OrganizationMemberRole role, bool isActive, DateTime? joinedAt, String? department, String? title, String? userName, String? userEmail, String? userAvatarUrl
});




}
/// @nodoc
class __$OrganizationMemberCopyWithImpl<$Res>
    implements _$OrganizationMemberCopyWith<$Res> {
  __$OrganizationMemberCopyWithImpl(this._self, this._then);

  final _OrganizationMember _self;
  final $Res Function(_OrganizationMember) _then;

/// Create a copy of OrganizationMember
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? userId = null,Object? organizationId = null,Object? role = null,Object? isActive = null,Object? joinedAt = freezed,Object? department = freezed,Object? title = freezed,Object? userName = freezed,Object? userEmail = freezed,Object? userAvatarUrl = freezed,}) {
  return _then(_OrganizationMember(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,userId: null == userId ? _self.userId : userId // ignore: cast_nullable_to_non_nullable
as String,organizationId: null == organizationId ? _self.organizationId : organizationId // ignore: cast_nullable_to_non_nullable
as String,role: null == role ? _self.role : role // ignore: cast_nullable_to_non_nullable
as OrganizationMemberRole,isActive: null == isActive ? _self.isActive : isActive // ignore: cast_nullable_to_non_nullable
as bool,joinedAt: freezed == joinedAt ? _self.joinedAt : joinedAt // ignore: cast_nullable_to_non_nullable
as DateTime?,department: freezed == department ? _self.department : department // ignore: cast_nullable_to_non_nullable
as String?,title: freezed == title ? _self.title : title // ignore: cast_nullable_to_non_nullable
as String?,userName: freezed == userName ? _self.userName : userName // ignore: cast_nullable_to_non_nullable
as String?,userEmail: freezed == userEmail ? _self.userEmail : userEmail // ignore: cast_nullable_to_non_nullable
as String?,userAvatarUrl: freezed == userAvatarUrl ? _self.userAvatarUrl : userAvatarUrl // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}


}


/// @nodoc
mixin _$OrganizationLicense {

 String get id; String get organizationId; String get licenseTypeId; int get totalSeats; int get usedSeats; String? get licenseKey; DateTime? get startDate; DateTime? get endDate; String get status;// License type info
 String? get licenseTypeName; String? get licenseTypeSlug;
/// Create a copy of OrganizationLicense
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$OrganizationLicenseCopyWith<OrganizationLicense> get copyWith => _$OrganizationLicenseCopyWithImpl<OrganizationLicense>(this as OrganizationLicense, _$identity);

  /// Serializes this OrganizationLicense to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is OrganizationLicense&&(identical(other.id, id) || other.id == id)&&(identical(other.organizationId, organizationId) || other.organizationId == organizationId)&&(identical(other.licenseTypeId, licenseTypeId) || other.licenseTypeId == licenseTypeId)&&(identical(other.totalSeats, totalSeats) || other.totalSeats == totalSeats)&&(identical(other.usedSeats, usedSeats) || other.usedSeats == usedSeats)&&(identical(other.licenseKey, licenseKey) || other.licenseKey == licenseKey)&&(identical(other.startDate, startDate) || other.startDate == startDate)&&(identical(other.endDate, endDate) || other.endDate == endDate)&&(identical(other.status, status) || other.status == status)&&(identical(other.licenseTypeName, licenseTypeName) || other.licenseTypeName == licenseTypeName)&&(identical(other.licenseTypeSlug, licenseTypeSlug) || other.licenseTypeSlug == licenseTypeSlug));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,organizationId,licenseTypeId,totalSeats,usedSeats,licenseKey,startDate,endDate,status,licenseTypeName,licenseTypeSlug);

@override
String toString() {
  return 'OrganizationLicense(id: $id, organizationId: $organizationId, licenseTypeId: $licenseTypeId, totalSeats: $totalSeats, usedSeats: $usedSeats, licenseKey: $licenseKey, startDate: $startDate, endDate: $endDate, status: $status, licenseTypeName: $licenseTypeName, licenseTypeSlug: $licenseTypeSlug)';
}


}

/// @nodoc
abstract mixin class $OrganizationLicenseCopyWith<$Res>  {
  factory $OrganizationLicenseCopyWith(OrganizationLicense value, $Res Function(OrganizationLicense) _then) = _$OrganizationLicenseCopyWithImpl;
@useResult
$Res call({
 String id, String organizationId, String licenseTypeId, int totalSeats, int usedSeats, String? licenseKey, DateTime? startDate, DateTime? endDate, String status, String? licenseTypeName, String? licenseTypeSlug
});




}
/// @nodoc
class _$OrganizationLicenseCopyWithImpl<$Res>
    implements $OrganizationLicenseCopyWith<$Res> {
  _$OrganizationLicenseCopyWithImpl(this._self, this._then);

  final OrganizationLicense _self;
  final $Res Function(OrganizationLicense) _then;

/// Create a copy of OrganizationLicense
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? organizationId = null,Object? licenseTypeId = null,Object? totalSeats = null,Object? usedSeats = null,Object? licenseKey = freezed,Object? startDate = freezed,Object? endDate = freezed,Object? status = null,Object? licenseTypeName = freezed,Object? licenseTypeSlug = freezed,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,organizationId: null == organizationId ? _self.organizationId : organizationId // ignore: cast_nullable_to_non_nullable
as String,licenseTypeId: null == licenseTypeId ? _self.licenseTypeId : licenseTypeId // ignore: cast_nullable_to_non_nullable
as String,totalSeats: null == totalSeats ? _self.totalSeats : totalSeats // ignore: cast_nullable_to_non_nullable
as int,usedSeats: null == usedSeats ? _self.usedSeats : usedSeats // ignore: cast_nullable_to_non_nullable
as int,licenseKey: freezed == licenseKey ? _self.licenseKey : licenseKey // ignore: cast_nullable_to_non_nullable
as String?,startDate: freezed == startDate ? _self.startDate : startDate // ignore: cast_nullable_to_non_nullable
as DateTime?,endDate: freezed == endDate ? _self.endDate : endDate // ignore: cast_nullable_to_non_nullable
as DateTime?,status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as String,licenseTypeName: freezed == licenseTypeName ? _self.licenseTypeName : licenseTypeName // ignore: cast_nullable_to_non_nullable
as String?,licenseTypeSlug: freezed == licenseTypeSlug ? _self.licenseTypeSlug : licenseTypeSlug // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}

}


/// Adds pattern-matching-related methods to [OrganizationLicense].
extension OrganizationLicensePatterns on OrganizationLicense {
/// A variant of `map` that fallback to returning `orElse`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _OrganizationLicense value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _OrganizationLicense() when $default != null:
return $default(_that);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// Callbacks receives the raw object, upcasted.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case final Subclass2 value:
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _OrganizationLicense value)  $default,){
final _that = this;
switch (_that) {
case _OrganizationLicense():
return $default(_that);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `map` that fallback to returning `null`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _OrganizationLicense value)?  $default,){
final _that = this;
switch (_that) {
case _OrganizationLicense() when $default != null:
return $default(_that);case _:
  return null;

}
}
/// A variant of `when` that fallback to an `orElse` callback.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String organizationId,  String licenseTypeId,  int totalSeats,  int usedSeats,  String? licenseKey,  DateTime? startDate,  DateTime? endDate,  String status,  String? licenseTypeName,  String? licenseTypeSlug)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _OrganizationLicense() when $default != null:
return $default(_that.id,_that.organizationId,_that.licenseTypeId,_that.totalSeats,_that.usedSeats,_that.licenseKey,_that.startDate,_that.endDate,_that.status,_that.licenseTypeName,_that.licenseTypeSlug);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// As opposed to `map`, this offers destructuring.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case Subclass2(:final field2):
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String organizationId,  String licenseTypeId,  int totalSeats,  int usedSeats,  String? licenseKey,  DateTime? startDate,  DateTime? endDate,  String status,  String? licenseTypeName,  String? licenseTypeSlug)  $default,) {final _that = this;
switch (_that) {
case _OrganizationLicense():
return $default(_that.id,_that.organizationId,_that.licenseTypeId,_that.totalSeats,_that.usedSeats,_that.licenseKey,_that.startDate,_that.endDate,_that.status,_that.licenseTypeName,_that.licenseTypeSlug);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `when` that fallback to returning `null`
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String organizationId,  String licenseTypeId,  int totalSeats,  int usedSeats,  String? licenseKey,  DateTime? startDate,  DateTime? endDate,  String status,  String? licenseTypeName,  String? licenseTypeSlug)?  $default,) {final _that = this;
switch (_that) {
case _OrganizationLicense() when $default != null:
return $default(_that.id,_that.organizationId,_that.licenseTypeId,_that.totalSeats,_that.usedSeats,_that.licenseKey,_that.startDate,_that.endDate,_that.status,_that.licenseTypeName,_that.licenseTypeSlug);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _OrganizationLicense extends OrganizationLicense {
  const _OrganizationLicense({required this.id, required this.organizationId, required this.licenseTypeId, required this.totalSeats, this.usedSeats = 0, this.licenseKey, this.startDate, this.endDate, this.status = 'ACTIVE', this.licenseTypeName, this.licenseTypeSlug}): super._();
  factory _OrganizationLicense.fromJson(Map<String, dynamic> json) => _$OrganizationLicenseFromJson(json);

@override final  String id;
@override final  String organizationId;
@override final  String licenseTypeId;
@override final  int totalSeats;
@override@JsonKey() final  int usedSeats;
@override final  String? licenseKey;
@override final  DateTime? startDate;
@override final  DateTime? endDate;
@override@JsonKey() final  String status;
// License type info
@override final  String? licenseTypeName;
@override final  String? licenseTypeSlug;

/// Create a copy of OrganizationLicense
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$OrganizationLicenseCopyWith<_OrganizationLicense> get copyWith => __$OrganizationLicenseCopyWithImpl<_OrganizationLicense>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$OrganizationLicenseToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _OrganizationLicense&&(identical(other.id, id) || other.id == id)&&(identical(other.organizationId, organizationId) || other.organizationId == organizationId)&&(identical(other.licenseTypeId, licenseTypeId) || other.licenseTypeId == licenseTypeId)&&(identical(other.totalSeats, totalSeats) || other.totalSeats == totalSeats)&&(identical(other.usedSeats, usedSeats) || other.usedSeats == usedSeats)&&(identical(other.licenseKey, licenseKey) || other.licenseKey == licenseKey)&&(identical(other.startDate, startDate) || other.startDate == startDate)&&(identical(other.endDate, endDate) || other.endDate == endDate)&&(identical(other.status, status) || other.status == status)&&(identical(other.licenseTypeName, licenseTypeName) || other.licenseTypeName == licenseTypeName)&&(identical(other.licenseTypeSlug, licenseTypeSlug) || other.licenseTypeSlug == licenseTypeSlug));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,organizationId,licenseTypeId,totalSeats,usedSeats,licenseKey,startDate,endDate,status,licenseTypeName,licenseTypeSlug);

@override
String toString() {
  return 'OrganizationLicense(id: $id, organizationId: $organizationId, licenseTypeId: $licenseTypeId, totalSeats: $totalSeats, usedSeats: $usedSeats, licenseKey: $licenseKey, startDate: $startDate, endDate: $endDate, status: $status, licenseTypeName: $licenseTypeName, licenseTypeSlug: $licenseTypeSlug)';
}


}

/// @nodoc
abstract mixin class _$OrganizationLicenseCopyWith<$Res> implements $OrganizationLicenseCopyWith<$Res> {
  factory _$OrganizationLicenseCopyWith(_OrganizationLicense value, $Res Function(_OrganizationLicense) _then) = __$OrganizationLicenseCopyWithImpl;
@override @useResult
$Res call({
 String id, String organizationId, String licenseTypeId, int totalSeats, int usedSeats, String? licenseKey, DateTime? startDate, DateTime? endDate, String status, String? licenseTypeName, String? licenseTypeSlug
});




}
/// @nodoc
class __$OrganizationLicenseCopyWithImpl<$Res>
    implements _$OrganizationLicenseCopyWith<$Res> {
  __$OrganizationLicenseCopyWithImpl(this._self, this._then);

  final _OrganizationLicense _self;
  final $Res Function(_OrganizationLicense) _then;

/// Create a copy of OrganizationLicense
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? organizationId = null,Object? licenseTypeId = null,Object? totalSeats = null,Object? usedSeats = null,Object? licenseKey = freezed,Object? startDate = freezed,Object? endDate = freezed,Object? status = null,Object? licenseTypeName = freezed,Object? licenseTypeSlug = freezed,}) {
  return _then(_OrganizationLicense(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,organizationId: null == organizationId ? _self.organizationId : organizationId // ignore: cast_nullable_to_non_nullable
as String,licenseTypeId: null == licenseTypeId ? _self.licenseTypeId : licenseTypeId // ignore: cast_nullable_to_non_nullable
as String,totalSeats: null == totalSeats ? _self.totalSeats : totalSeats // ignore: cast_nullable_to_non_nullable
as int,usedSeats: null == usedSeats ? _self.usedSeats : usedSeats // ignore: cast_nullable_to_non_nullable
as int,licenseKey: freezed == licenseKey ? _self.licenseKey : licenseKey // ignore: cast_nullable_to_non_nullable
as String?,startDate: freezed == startDate ? _self.startDate : startDate // ignore: cast_nullable_to_non_nullable
as DateTime?,endDate: freezed == endDate ? _self.endDate : endDate // ignore: cast_nullable_to_non_nullable
as DateTime?,status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as String,licenseTypeName: freezed == licenseTypeName ? _self.licenseTypeName : licenseTypeName // ignore: cast_nullable_to_non_nullable
as String?,licenseTypeSlug: freezed == licenseTypeSlug ? _self.licenseTypeSlug : licenseTypeSlug // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}


}

// dart format on
