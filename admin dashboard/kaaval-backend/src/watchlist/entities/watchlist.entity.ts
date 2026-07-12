import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Vehicle } from '../../vehicles/entities/vehicle.entity.js';
import { User } from '../../users/entities/user.entity.js';

@Entity('watchlist')
export class Watchlist {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index({ unique: true })
  @Column({ name: 'vehicle_id', type: 'varchar' })
  vehicleId!: string;

  @Column({ type: 'text', nullable: true })
  reason!: string | null;

  @Column({ type: 'varchar', length: 20, default: 'MEDIUM' })
  priority!: string; // CRITICAL, HIGH, MEDIUM, LOW

  @Column({ name: 'expiry_date', type: 'date', nullable: true })
  expiryDate!: string | null; // null = permanent

  @Index()
  @Column({ name: 'added_by', type: 'varchar', nullable: true })
  addedByUserId!: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ name: 'alert_on_detect', type: 'boolean', default: true })
  alertOnDetect!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  // ── Relations ─────────────────────────────────────────────────
  @ManyToOne(() => Vehicle, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'vehicle_id' })
  vehicle!: Vehicle;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'added_by' })
  addedBy!: User | null;
}
