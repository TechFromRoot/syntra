import { Module } from '@nestjs/common';
import { VybeIntegrationService } from './vybe-integration.service';

@Module({
  providers: [VybeIntegrationService]
})
export class VybeIntegrationModule {}
