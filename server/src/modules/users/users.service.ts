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

const PUBLIC_USER_SELECT = {
  id: true,
  phone: true,
  email: true,
  name: true,
  avatar: true,
  country: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async me(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { ...PUBLIC_USER_SELECT, preference: true },
    });
    return user;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.avatar !== undefined ? { avatar: dto.avatar } : {}),
        ...(dto.country !== undefined ? { country: dto.country } : {}),
      },
      select: { ...PUBLIC_USER_SELECT, preference: true },
    });
    return user;
  }

  updatePreferences(userId: string, dto: UpdatePreferencesDto) {
    return this.prisma.userPreference.upsert({
      where: { userId },
      create: { userId, ...dto },
      update: { ...dto },
    });
  }
}
