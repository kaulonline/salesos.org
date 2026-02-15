// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'cached_lead.dart';

// **************************************************************************
// TypeAdapterGenerator
// **************************************************************************

class CachedLeadAdapter extends TypeAdapter<CachedLead> {
  @override
  final int typeId = 1;

  @override
  CachedLead read(BinaryReader reader) {
    final numOfFields = reader.readByte();
    final fields = <int, dynamic>{
      for (int i = 0; i < numOfFields; i++) reader.readByte(): reader.read(),
    };
    return CachedLead(
      id: fields[0] as String,
      firstName: fields[1] as String?,
      lastName: fields[2] as String?,
      company: fields[3] as String?,
      title: fields[4] as String?,
      email: fields[5] as String?,
      phone: fields[6] as String?,
      mobilePhone: fields[7] as String?,
      status: fields[8] as String?,
      rating: fields[9] as String?,
      industry: fields[10] as String?,
      leadSource: fields[11] as String?,
      description: fields[12] as String?,
      street: fields[13] as String?,
      city: fields[14] as String?,
      state: fields[15] as String?,
      postalCode: fields[16] as String?,
      numberOfEmployees: fields[17] as int?,
      annualRevenue: fields[18] as double?,
      website: fields[19] as String?,
      createdAt: fields[20] as DateTime?,
      updatedAt: fields[21] as DateTime?,
      cachedAt: fields[22] as DateTime?,
    );
  }

  @override
  void write(BinaryWriter writer, CachedLead obj) {
    writer
      ..writeByte(23)
      ..writeByte(0)
      ..write(obj.id)
      ..writeByte(1)
      ..write(obj.firstName)
      ..writeByte(2)
      ..write(obj.lastName)
      ..writeByte(3)
      ..write(obj.company)
      ..writeByte(4)
      ..write(obj.title)
      ..writeByte(5)
      ..write(obj.email)
      ..writeByte(6)
      ..write(obj.phone)
      ..writeByte(7)
      ..write(obj.mobilePhone)
      ..writeByte(8)
      ..write(obj.status)
      ..writeByte(9)
      ..write(obj.rating)
      ..writeByte(10)
      ..write(obj.industry)
      ..writeByte(11)
      ..write(obj.leadSource)
      ..writeByte(12)
      ..write(obj.description)
      ..writeByte(13)
      ..write(obj.street)
      ..writeByte(14)
      ..write(obj.city)
      ..writeByte(15)
      ..write(obj.state)
      ..writeByte(16)
      ..write(obj.postalCode)
      ..writeByte(17)
      ..write(obj.numberOfEmployees)
      ..writeByte(18)
      ..write(obj.annualRevenue)
      ..writeByte(19)
      ..write(obj.website)
      ..writeByte(20)
      ..write(obj.createdAt)
      ..writeByte(21)
      ..write(obj.updatedAt)
      ..writeByte(22)
      ..write(obj.cachedAt);
  }

  @override
  int get hashCode => typeId.hashCode;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is CachedLeadAdapter &&
          runtimeType == other.runtimeType &&
          typeId == other.typeId;
}
