import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { Violation } from '../../violations/entities/violation.entity.js';

@Entity('vehicles')
export class Vehicle {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index({ unique: true })
  @Column({ name: 'registration_number', type: 'varchar', length: 30 })
  registrationNumber!: string;

  @Column({ name: 'state_code', type: 'varchar', length: 10, nullable: true })
  stateCode!: string | null;

  @Column({ name: 'vehicle_type', type: 'varchar', length: 50, nullable: true })
  vehicleType!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  manufacturer!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  model!: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  color!: string | null;

  @Column({ name: 'is_watchlisted', type: 'boolean', default: false })
  isWatchlisted!: boolean;

  @OneToMany(() => Violation, (v) => v.vehicle)
  violations!: Violation[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
