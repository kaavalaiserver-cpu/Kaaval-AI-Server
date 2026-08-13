import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { KnownVehicle } from './known-vehicle.entity.js';

@Entity('known_vehicle_hits')
export class KnownVehicleHit {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'known_vehicle_id', type: 'varchar' })
  knownVehicleId!: string;

  @Column({ name: 'vehicle_number', type: 'varchar', length: 20 })
  vehicleNumber!: string;

  @Column({ name: 'violation_type', type: 'varchar', length: 100, nullable: true })
  violationType!: string | null;

  @Column({ name: 'camera_id', type: 'varchar', nullable: true })
  cameraId!: string | null;

  @Column({ name: 'camera_name', type: 'varchar', nullable: true })
  cameraName!: string | null;

  @Column({ name: 'location', type: 'varchar', nullable: true })
  location!: string | null;

  @Column({ name: 'confidence', type: 'float', nullable: true })
  confidence!: number | null;

  @CreateDateColumn({ name: 'hit_timestamp' })
  hitTimestamp!: Date;

  @ManyToOne(() => KnownVehicle, (kv) => kv.hits, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'known_vehicle_id' })
  knownVehicle!: KnownVehicle;
}
