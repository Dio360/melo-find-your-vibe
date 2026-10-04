import { Controller, Get, Query } from '@nestjs/common';
import { Public } from '../auth/public.decorator.js';
import { SearchService } from './search.service.js';

@Public()
@Controller('search')
export class SearchController {
  constructor(private readonly search: SearchService) {}

  @Get()
  query(@Query('q') q = '', @Query('entity') entity?: string) {
    return this.search.search(q, entity);
  }
}
