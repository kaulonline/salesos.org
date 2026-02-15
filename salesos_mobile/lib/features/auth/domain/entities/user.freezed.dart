// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'user.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$User {

 String get id; String get email; String? get name;// Backend returns 'name' as single field
 String? get firstName; String? get lastName; String? get avatarUrl; String? get phone; String? get company; String? get role; bool get isEmailVerified; DateTime? get createdAt; DateTime? get updatedAt;// Organization context (B2B enterprise)
 String? get organizationId; String? get organizationName; String? get organizationRole;// OWNER, ADMIN, MANAGER, MEMBER
 String? get organizationSlug;
/// Create a copy of User
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$UserCopyWith<User> get copyWith => _$UserCopyWithImpl<User>(this as User, _$identity);

  /// Serializes this User to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is User&&(identical(other.id, id) || other.id == id)&&(identical(other.email, email) || other.email == email)&&(identical(other.name, name) || other.name == name)&&(identical(other.firstName, firstName) || other.firstName == firstName)&&(identical(other.lastName, lastName) || other.lastName == lastName)&&(identical(other.avatarUrl, avatarUrl) || other.avatarUrl == avatarUrl)&&(identical(other.phone, phone) || other.phone == phone)&&(identical(other.company, company) || other.company == company)&&(identical(other.role, role) || other.role == role)&&(identical(other.isEmailVerified, isEmailVerified) || other.isEmailVerified == isEmailVerified)&&(identical(other.createdAt, createdAt) || other.createdAt == createdAt)&&(identical(other.updatedAt, updatedAt) || other.updatedAt == updatedAt)&&(identical(other.organizationId, organizationId) || other.organizationId == organizationId)&&(identical(other.organizationName, organizationName) || other.organizationName == organizationName)&&(identical(other.organizationRole, organizationRole) || other.organizationRole == organizationRole)&&(identical(other.organizationSlug, organizationSlug) || other.organizationSlug == organizationSlug));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,email,name,firstName,lastName,avatarUrl,phone,company,role,isEmailVerified,createdAt,updatedAt,organizationId,organizationName,organizationRole,organizationSlug);

@override
String toString() {
  return 'User(id: $id, email: $email, name: $name, firstName: $firstName, lastName: $lastName, avatarUrl: $avatarUrl, phone: $phone, company: $company, role: $role, isEmailVerified: $isEmailVerified, createdAt: $createdAt, updatedAt: $updatedAt, organizationId: $organizationId, organizationName: $organizationName, organizationRole: $organizationRole, organizationSlug: $organizationSlug)';
}


}

/// @nodoc
abstract mixin class $UserCopyWith<$Res>  {
  factory $UserCopyWith(User value, $Res Function(User) _then) = _$UserCopyWithImpl;
@useResult
$Res call({
 String id, String email, String? name, String? firstName, String? lastName, String? avatarUrl, String? phone, String? company, String? role, bool isEmailVerified, DateTime? createdAt, DateTime? updatedAt, String? organizationId, String? organizationName, String? organizationRole, String? organizationSlug
});




}
/// @nodoc
class _$UserCopyWithImpl<$Res>
    implements $UserCopyWith<$Res> {
  _$UserCopyWithImpl(this._self, this._then);

  final User _self;
  final $Res Function(User) _then;

/// Create a copy of User
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? email = null,Object? name = freezed,Object? firstName = freezed,Object? lastName = freezed,Object? avatarUrl = freezed,Object? phone = freezed,Object? company = freezed,Object? role = freezed,Object? isEmailVerified = null,Object? createdAt = freezed,Object? updatedAt = freezed,Object? organizationId = freezed,Object? organizationName = freezed,Object? organizationRole = freezed,Object? organizationSlug = freezed,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,email: null == email ? _self.email : email // ignore: cast_nullable_to_non_nullable
as String,name: freezed == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String?,firstName: freezed == firstName ? _self.firstName : firstName // ignore: cast_nullable_to_non_nullable
as String?,lastName: freezed == lastName ? _self.lastName : lastName // ignore: cast_nullable_to_non_nullable
as String?,avatarUrl: freezed == avatarUrl ? _self.avatarUrl : avatarUrl // ignore: cast_nullable_to_non_nullable
as String?,phone: freezed == phone ? _self.phone : phone // ignore: cast_nullable_to_non_nullable
as String?,company: freezed == company ? _self.company : company // ignore: cast_nullable_to_non_nullable
as String?,role: freezed == role ? _self.role : role // ignore: cast_nullable_to_non_nullable
as String?,isEmailVerified: null == isEmailVerified ? _self.isEmailVerified : isEmailVerified // ignore: cast_nullable_to_non_nullable
as bool,createdAt: freezed == createdAt ? _self.createdAt : createdAt // ignore: cast_nullable_to_non_nullable
as DateTime?,updatedAt: freezed == updatedAt ? _self.updatedAt : updatedAt // ignore: cast_nullable_to_non_nullable
as DateTime?,organizationId: freezed == organizationId ? _self.organizationId : organizationId // ignore: cast_nullable_to_non_nullable
as String?,organizationName: freezed == organizationName ? _self.organizationName : organizationName // ignore: cast_nullable_to_non_nullable
as String?,organizationRole: freezed == organizationRole ? _self.organizationRole : organizationRole // ignore: cast_nullable_to_non_nullable
as String?,organizationSlug: freezed == organizationSlug ? _self.organizationSlug : organizationSlug // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}

}


/// Adds pattern-matching-related methods to [User].
extension UserPatterns on User {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _User value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _User() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _User value)  $default,){
final _that = this;
switch (_that) {
case _User():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _User value)?  $default,){
final _that = this;
switch (_that) {
case _User() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String email,  String? name,  String? firstName,  String? lastName,  String? avatarUrl,  String? phone,  String? company,  String? role,  bool isEmailVerified,  DateTime? createdAt,  DateTime? updatedAt,  String? organizationId,  String? organizationName,  String? organizationRole,  String? organizationSlug)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _User() when $default != null:
return $default(_that.id,_that.email,_that.name,_that.firstName,_that.lastName,_that.avatarUrl,_that.phone,_that.company,_that.role,_that.isEmailVerified,_that.createdAt,_that.updatedAt,_that.organizationId,_that.organizationName,_that.organizationRole,_that.organizationSlug);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String email,  String? name,  String? firstName,  String? lastName,  String? avatarUrl,  String? phone,  String? company,  String? role,  bool isEmailVerified,  DateTime? createdAt,  DateTime? updatedAt,  String? organizationId,  String? organizationName,  String? organizationRole,  String? organizationSlug)  $default,) {final _that = this;
switch (_that) {
case _User():
return $default(_that.id,_that.email,_that.name,_that.firstName,_that.lastName,_that.avatarUrl,_that.phone,_that.company,_that.role,_that.isEmailVerified,_that.createdAt,_that.updatedAt,_that.organizationId,_that.organizationName,_that.organizationRole,_that.organizationSlug);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String email,  String? name,  String? firstName,  String? lastName,  String? avatarUrl,  String? phone,  String? company,  String? role,  bool isEmailVerified,  DateTime? createdAt,  DateTime? updatedAt,  String? organizationId,  String? organizationName,  String? organizationRole,  String? organizationSlug)?  $default,) {final _that = this;
switch (_that) {
case _User() when $default != null:
return $default(_that.id,_that.email,_that.name,_that.firstName,_that.lastName,_that.avatarUrl,_that.phone,_that.company,_that.role,_that.isEmailVerified,_that.createdAt,_that.updatedAt,_that.organizationId,_that.organizationName,_that.organizationRole,_that.organizationSlug);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _User extends User {
  const _User({required this.id, required this.email, this.name, this.firstName, this.lastName, this.avatarUrl, this.phone, this.company, this.role, this.isEmailVerified = false, this.createdAt, this.updatedAt, this.organizationId, this.organizationName, this.organizationRole, this.organizationSlug}): super._();
  factory _User.fromJson(Map<String, dynamic> json) => _$UserFromJson(json);

@override final  String id;
@override final  String email;
@override final  String? name;
// Backend returns 'name' as single field
@override final  String? firstName;
@override final  String? lastName;
@override final  String? avatarUrl;
@override final  String? phone;
@override final  String? company;
@override final  String? role;
@override@JsonKey() final  bool isEmailVerified;
@override final  DateTime? createdAt;
@override final  DateTime? updatedAt;
// Organization context (B2B enterprise)
@override final  String? organizationId;
@override final  String? organizationName;
@override final  String? organizationRole;
// OWNER, ADMIN, MANAGER, MEMBER
@override final  String? organizationSlug;

/// Create a copy of User
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$UserCopyWith<_User> get copyWith => __$UserCopyWithImpl<_User>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$UserToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _User&&(identical(other.id, id) || other.id == id)&&(identical(other.email, email) || other.email == email)&&(identical(other.name, name) || other.name == name)&&(identical(other.firstName, firstName) || other.firstName == firstName)&&(identical(other.lastName, lastName) || other.lastName == lastName)&&(identical(other.avatarUrl, avatarUrl) || other.avatarUrl == avatarUrl)&&(identical(other.phone, phone) || other.phone == phone)&&(identical(other.company, company) || other.company == company)&&(identical(other.role, role) || other.role == role)&&(identical(other.isEmailVerified, isEmailVerified) || other.isEmailVerified == isEmailVerified)&&(identical(other.createdAt, createdAt) || other.createdAt == createdAt)&&(identical(other.updatedAt, updatedAt) || other.updatedAt == updatedAt)&&(identical(other.organizationId, organizationId) || other.organizationId == organizationId)&&(identical(other.organizationName, organizationName) || other.organizationName == organizationName)&&(identical(other.organizationRole, organizationRole) || other.organizationRole == organizationRole)&&(identical(other.organizationSlug, organizationSlug) || other.organizationSlug == organizationSlug));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,email,name,firstName,lastName,avatarUrl,phone,company,role,isEmailVerified,createdAt,updatedAt,organizationId,organizationName,organizationRole,organizationSlug);

@override
String toString() {
  return 'User(id: $id, email: $email, name: $name, firstName: $firstName, lastName: $lastName, avatarUrl: $avatarUrl, phone: $phone, company: $company, role: $role, isEmailVerified: $isEmailVerified, createdAt: $createdAt, updatedAt: $updatedAt, organizationId: $organizationId, organizationName: $organizationName, organizationRole: $organizationRole, organizationSlug: $organizationSlug)';
}


}

/// @nodoc
abstract mixin class _$UserCopyWith<$Res> implements $UserCopyWith<$Res> {
  factory _$UserCopyWith(_User value, $Res Function(_User) _then) = __$UserCopyWithImpl;
@override @useResult
$Res call({
 String id, String email, String? name, String? firstName, String? lastName, String? avatarUrl, String? phone, String? company, String? role, bool isEmailVerified, DateTime? createdAt, DateTime? updatedAt, String? organizationId, String? organizationName, String? organizationRole, String? organizationSlug
});




}
/// @nodoc
class __$UserCopyWithImpl<$Res>
    implements _$UserCopyWith<$Res> {
  __$UserCopyWithImpl(this._self, this._then);

  final _User _self;
  final $Res Function(_User) _then;

/// Create a copy of User
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? email = null,Object? name = freezed,Object? firstName = freezed,Object? lastName = freezed,Object? avatarUrl = freezed,Object? phone = freezed,Object? company = freezed,Object? role = freezed,Object? isEmailVerified = null,Object? createdAt = freezed,Object? updatedAt = freezed,Object? organizationId = freezed,Object? organizationName = freezed,Object? organizationRole = freezed,Object? organizationSlug = freezed,}) {
  return _then(_User(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,email: null == email ? _self.email : email // ignore: cast_nullable_to_non_nullable
as String,name: freezed == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String?,firstName: freezed == firstName ? _self.firstName : firstName // ignore: cast_nullable_to_non_nullable
as String?,lastName: freezed == lastName ? _self.lastName : lastName // ignore: cast_nullable_to_non_nullable
as String?,avatarUrl: freezed == avatarUrl ? _self.avatarUrl : avatarUrl // ignore: cast_nullable_to_non_nullable
as String?,phone: freezed == phone ? _self.phone : phone // ignore: cast_nullable_to_non_nullable
as String?,company: freezed == company ? _self.company : company // ignore: cast_nullable_to_non_nullable
as String?,role: freezed == role ? _self.role : role // ignore: cast_nullable_to_non_nullable
as String?,isEmailVerified: null == isEmailVerified ? _self.isEmailVerified : isEmailVerified // ignore: cast_nullable_to_non_nullable
as bool,createdAt: freezed == createdAt ? _self.createdAt : createdAt // ignore: cast_nullable_to_non_nullable
as DateTime?,updatedAt: freezed == updatedAt ? _self.updatedAt : updatedAt // ignore: cast_nullable_to_non_nullable
as DateTime?,organizationId: freezed == organizationId ? _self.organizationId : organizationId // ignore: cast_nullable_to_non_nullable
as String?,organizationName: freezed == organizationName ? _self.organizationName : organizationName // ignore: cast_nullable_to_non_nullable
as String?,organizationRole: freezed == organizationRole ? _self.organizationRole : organizationRole // ignore: cast_nullable_to_non_nullable
as String?,organizationSlug: freezed == organizationSlug ? _self.organizationSlug : organizationSlug // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}


}

// dart format on
