import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

export class CreateVibeDto {
  name!: string;
  category!: string;
  colorHex?: string;
}

@Injectable()
export class VibesService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.vibe.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
    });
  }

  async groups() {
    const vibes = await this.list();
    const groups: Record<string, typeof vibes> = {};
    for (const vibe of vibes) {
      (groups[vibe.category] ??= []).push(vibe);
    }
    return groups;
  }

  create(dto: CreateVibeDto) {
    return this.prisma.vibe.create({
      data: { name: dto.name, category: dto.category, colorHex: dto.colorHex ?? '#1DB95D' },
    });
  }

  async update(id: string, dto: Partial<CreateVibeDto & { active?: boolean }>) {
    try {
      return await this.prisma.vibe.update({ where: { id }, data: { ...dto } });
    } catch {
      throw new NotFoundException('Vibe not found');
    }
  }
}
