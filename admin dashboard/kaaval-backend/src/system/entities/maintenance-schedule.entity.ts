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
import { Camera } from '../../cameras/entities/camera.entity.js';
import { User } from '../../users/entities/user.entity.js';

@Entity('maintenance_schedule')
export class MaintenanceSchedule {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'camera_id', type: 'varchar' })
  cameraId!: string;

  @Column({ name: 'maintenance_type', type: 'varchar', length: 50 })
  maintenanceType!: string; // CLEANING, HARDWARE_REPLACEMENT, NETWORK_CHECK

  @Column({ name: 'scheduled_date', type: 'date' })
  scheduledDate!: string;

  @Column({ type: 'varchar', length: 20, default: 'PENDING' })
  status!: string; // PENDING, IN_PROGRESS, COMPLETED, CANCELLED

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @Index()
  @Column({ name: 'assigned_to', type: 'varchar', nullable: true })
  assignedToUserId!: string | null;

  @Column({ name: 'completed_at', type: 'datetime', nullable: true })
  completedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @ManyToOne(() => Camera, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'camera_id' })
  camera!: Camera;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'assigned_to' })
  assignedTo!: User | null;
}
