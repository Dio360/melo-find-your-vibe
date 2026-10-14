import { Controller, Post, Body, HttpException, HttpStatus } from '@nestjs/common';

/**
 * AI worship generation (stack v2 stub).
 * Text-to-music providers (Hugging Face DiffRhythm/Flow, ElevenLabs) need
 * GPU time or paid credits, so generation is NOT faked: without
 * AI_MUSIC_PROVIDER + AI_MUSIC_API_KEY configured, this endpoint returns
 * 501 with setup instructions instead of inventing audio. When configured,
 * generated files must be uploaded through /uploads/complete with
 * source='ai-generated' so they enter the admin approval queue like any
 * other unlicensed content.
 */
@Controller('ai')
export class AiGenerateController {
  @Post('generate')
  generate(@Body() body: { prompt?: string; mood?: string; duration?: number }) {
    const provider = (process.env.AI_MUSIC_PROVIDER ?? '').trim();
    const key = (process.env.AI_MUSIC_API_KEY ?? '').trim();
    if (!provider || !key) {
      throw new HttpException(
        'AI music generation is not configured (set AI_MUSIC_PROVIDER=huggingface|elevenlabs and AI_MUSIC_API_KEY). ' +
          'Supported moods: worship, praise, prayer, bible-study.',
        HttpStatus.NOT_IMPLEMENTED,
      );
    }
    void body;
    throw new HttpException(
      `Provider '${provider}' wiring is scaffolded but the generation call is not implemented yet — no audio was faked.`,
      HttpStatus.NOT_IMPLEMENTED,
    );
  }
}
