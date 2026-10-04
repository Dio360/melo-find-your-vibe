import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  CatalogueService,
  CreateAlbumDto,
  CreateArtistDto,
  CreateTrackDto,
} from './catalogue.service.js';
import { Public } from '../auth/public.decorator.js';

@Public()
@Controller('catalogue')
export class CatalogueController {
  constructor(private readonly catalogue: CatalogueService) {}

  @Get('artists')
  listArtists(@Query() query: { take?: string; skip?: string; search?: string }) {
    return this.catalogue.listArtists(query);
  }

  @Post('artists')
  createArtist(@Body() dto: CreateArtistDto) {
    return this.catalogue.createArtist(dto);
  }

  @Get('artists/:id')
  artistDetail(@Param('id') id: string) {
    return this.catalogue.artistDetail(id);
  }

  @Patch('artists/:id')
  updateArtist(@Param('id') id: string, @Body() dto: Partial<CreateArtistDto>) {
    return this.catalogue.updateArtist(id, dto);
  }

  @Get('albums')
  listAlbums(@Query() query: { take?: string; skip?: string; artistId?: string }) {
    return this.catalogue.listAlbums(query);
  }

  @Post('albums')
  createAlbum(@Body() dto: CreateAlbumDto) {
    return this.catalogue.createAlbum(dto);
  }

  @Get('albums/:id')
  albumDetail(@Param('id') id: string) {
    return this.catalogue.albumDetail(id);
  }

  @Get('tracks')
  listTracks(
    @Query()
    query: { take?: string; skip?: string; genre?: string; region?: string; search?: string },
  ) {
    return this.catalogue.listTracks(query);
  }

  @Post('tracks')
  createTrack(@Body() dto: CreateTrackDto) {
    return this.catalogue.createTrack(dto);
  }

  @Get('tracks/:id')
  trackDetail(@Param('id') id: string) {
    return this.catalogue.trackDetail(id);
  }

  @Patch('tracks/:id')
  updateTrack(@Param('id') id: string, @Body() dto: Partial<CreateTrackDto>) {
    return this.catalogue.updateTrack(id, dto);
  }

  @Delete('tracks/:id')
  deleteTrack(@Param('id') id: string) {
    return this.catalogue.deleteTrack(id);
  }

  @Post('tracks/:id/rights')
  grantRight(
    @Param('id') id: string,
    @Body() dto: { territory?: string; streamingAllowed?: boolean },
  ) {
    return this.catalogue.grantRight(id, dto);
  }
}
