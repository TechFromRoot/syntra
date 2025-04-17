import { Test, TestingModule } from '@nestjs/testing';
import { VybeIntegrationService } from './vybe-integration.service';

describe('VybeIntegrationService', () => {
  let service: VybeIntegrationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [VybeIntegrationService],
    }).compile();

    service = module.get<VybeIntegrationService>(VybeIntegrationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
