// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'cached_contact.dart';

// **************************************************************************
// TypeAdapterGenerator
// **************************************************************************

class CachedContactAdapter extends TypeAdapter<CachedContact> {
  @override
  final int typeId = 2;

  @override
  CachedContact read(BinaryReader reader) {
    final numOfFields = reader.readByte();
    final fields = <int, dynamic>{
      for (int i = 0; i < numOfFields; i++) reader.readByte(): reader.read(),
    };
    return CachedContact(
      id: fields[0] as String,
      firstName: fields[1] as String?,
      lastName: fields[2] as String?,
      email: fields[3] as String?,
      phone: fields[4] as String?,
      mobilePhone: fields[5] as String?,
      title: fields[6] as String?,
      department: fields[7] as String?,
      accountId: fields[8] as String?,
      accountName: fields[9] as String?,
      mailingStreet: fields[10] as String?,
      mailingCity: fields[11] as String?,
      mailingState: fields[12] as String?,
      mailingPostalCode: fields[13] as String?,
      description: fields[14] as String?,
      createdAt: fields[15] as DateTime?,
      updatedAt: fields[16] as DateTime?,
      cachedAt: fields[17] as DateTime?,
    );
  }

  @override
  void write(BinaryWriter writer, CachedContact obj) {
    writer
      ..writeByte(18)
      ..writeByte(0)
      ..write(obj.id)
      ..writeByte(1)
      ..write(obj.firstName)
      ..writeByte(2)
      ..write(obj.lastName)
      ..writeByte(3)
      ..write(obj.email)
      ..writeByte(4)
      ..write(obj.phone)
      ..writeByte(5)
      ..write(obj.mobilePhone)
      ..writeByte(6)
      ..write(obj.title)
      ..writeByte(7)
      ..write(obj.department)
      ..writeByte(8)
      ..write(obj.accountId)
      ..writeByte(9)
      ..write(obj.accountName)
      ..writeByte(10)
      ..write(obj.mailingStreet)
      ..writeByte(11)
      ..write(obj.mailingCity)
      ..writeByte(12)
      ..write(obj.mailingState)
      ..writeByte(13)
      ..write(obj.mailingPostalCode)
      ..writeByte(14)
      ..write(obj.description)
      ..writeByte(15)
      ..write(obj.createdAt)
      ..writeByte(16)
      ..write(obj.updatedAt)
      ..writeByte(17)
      ..write(obj.cachedAt);
  }

  @override
  int get hashCode => typeId.hashCode;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is CachedContactAdapter &&
          runtimeType == other.runtimeType &&
          typeId == other.typeId;
}
