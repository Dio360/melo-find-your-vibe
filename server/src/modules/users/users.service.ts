import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

export class UpdateProfileDto {
  name?: string;
  avatar?: string;
  country?: string;
}

export class UpdatePreferencesDto {
  genres?: string[];
  artists?: string[];
  languages?: string[];
  regions?: string[];
  moods?: string[];
  activities?: string[];
  dataMode?: string;
  explicitPreference?: string;
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  me(userId: string) {
    return this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: { preference: true },
    });
  }

  updateProfile(userId: string, dto: UpdateProfileDto) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.avatar !== undefined ? { avatar: dto.avatar } : {}),
        ...(dto.country !== undefined ? { country: dto.country } : {}),
      },
      include: { preference: true },
    });
  }

  updatePreferences(userId: string, dto: UpdatePreferencesDto) {
    return this.prisma.userPreference.upsert({
      where: { userId },
      create: { userId, ...dto },
      update: { ...dto },
    });
  }
}
