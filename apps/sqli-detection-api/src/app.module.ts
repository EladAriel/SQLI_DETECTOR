import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DetectionModule } from './detection/detection.module';
import { AnalysisModule } from './analysis/analysis.module';
import { SecurityModule } from './security/security.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    DetectionModule,
    AnalysisModule,
    SecurityModule,
    HealthModule,
  ],
})
export class AppModule {}
