import { Test, TestingModule } from '@nestjs/testing';
import { SyntraBotService } from './syntra-bot.service';

describe('SyntraBotService', () => {
  let service: SyntraBotService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SyntraBotService],
    }).compile();

    service = module.get<SyntraBotService>(SyntraBotService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
