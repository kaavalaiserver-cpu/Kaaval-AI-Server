import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ViolationsService } from './violations/violations.service';
import { ViolationQueryDto } from './violations/dto/violation.dto';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const service = app.get(ViolationsService);
  const query = new ViolationQueryDto();
  query.dateFrom = '2026-06-13T00:00:00';
  query.dateTo = '2026-06-13T23:59:59';
  
  const stats = await service.getStats(query);
  console.log('STATS FOR 13-06:', stats);
  
  const queryAll = new ViolationQueryDto();
  const allStats = await service.getStats(queryAll);
  console.log('STATS ALL:', allStats);
  
  await app.close();
}
bootstrap();
