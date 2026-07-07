import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('platform_metrics')
export class PlatformMetric {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'metric_name', type: 'varchar', length: 100 })
  metricName!: string; // e.g. ACTIVE_CAMERAS, TOTAL_VIOLATIONS_TODAY, DB_CPU

  @Column({ type: 'float' })
  value!: number;

  @Column({ type: 'json', nullable: true })
  labels!: any | null; // e.g. {"subdivision_id": "...", "node": "worker-1"}

  @Index()
  @Column({ name: 'recorded_at', type: 'datetime' })
  recordedAt!: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
