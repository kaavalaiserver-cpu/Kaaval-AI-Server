import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('cameras')
export class Camera {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'camera_id', type: 'varchar', length: 50, unique: true })
  cameraId!: string;

  @Column({ name: 'location_name', type: 'varchar', length: 200 })
  locationName!: string;

  @Column({ name: 'gps_lat', type: 'float', nullable: true })
  gpsLat!: number | null;

  @Column({ name: 'gps_lng', type: 'float', nullable: true })
  gpsLng!: number | null;

  @Column({ name: 'stream_url', type: 'varchar', length: 500, nullable: true })
  streamUrl!: string | null;

  @Column({ type: 'varchar', length: 20, default: 'online' })
  status!: string;

  @Column({ name: 'last_active', nullable: true })
  lastActive!: Date | null;

  @Column({ name: 'violation_count', type: 'int', default: 0 })
  violationCount!: number;

  @Column({ name: 'ai_enabled', type: 'boolean', default: true })
  aiEnabled!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
