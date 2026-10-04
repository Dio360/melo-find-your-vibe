import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { Public } from '../auth/public.decorator.js';
import { CreateVibeDto, VibesService } from './vibes.service.js';

@Controller('vibes')
export class VibesController {
  constructor(private readonly vibes: VibesService) {}

  @Public()
  @Get()
  list() {
    return this.vibes.list();
  }

  @Public()
  @Get('groups')
  groups() {
    return this.vibes.groups();
  }

  @Post()
  create(@Body() dto: CreateVibeDto) {
    return this.vibes.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: Partial<CreateVibeDto & { active?: boolean }>) {
    return this.vibes.update(id, dto);
  }
}
