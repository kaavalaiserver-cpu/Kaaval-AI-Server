import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { KnownVehicleHit } from './known-vehicle-hit.entity.js';

@Entity('known_vehicles')
export class KnownVehicle {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'vehicle_number', type: 'varchar', length: 20, unique: true })
  vehicleNumber!: string;

  @Column({ type: 'text', nullable: true })
  reason!: string | null;

  @Column({ name: 'added_by_user_id', type: 'varchar', nullable: true })
  addedByUserId!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @OneToMany(() => KnownVehicleHit, (h) => h.knownVehicle)
  hits!: KnownVehicleHit[];
}
