import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Vehicle } from './vehicle.entity.js';

@Entity('vehicle_history')
export class VehicleHistory {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index({ unique: true })
  @Column({ name: 'vehicle_id', type: 'varchar' })
  vehicleId!: string;

  @Column({ name: 'total_violations', type: 'int', default: 0 })
  totalViolations!: number;

  @Column({ name: 'approved_violations', type: 'int', default: 0 })
  approvedViolations!: number;

  @Column({ name: 'rejected_violations', type: 'int', default: 0 })
  rejectedViolations!: number;

  @Column({ name: 'total_fine', type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalFine!: number;

  @Column({ name: 'last_violation', type: 'datetime', nullable: true })
  lastViolation!: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @OneToOne(() => Vehicle, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'vehicle_id' })
  vehicle!: Vehicle;
}
