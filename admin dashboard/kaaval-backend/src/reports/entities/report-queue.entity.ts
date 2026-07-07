import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity.js';

@Entity('report_queue')
export class ReportQueue {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'report_type', type: 'varchar', length: 50 })
  reportType!: string;

  @Index()
  @Column({ name: 'requested_by', type: 'varchar' })
  requestedByUserId!: string;

  @Column({ type: 'varchar', length: 50, default: 'PENDING' })
  status!: string;

  @Column({ type: 'json', nullable: true })
  parameters!: any | null;

  @Column({ name: 'started_at', type: 'datetime', nullable: true })
  startedAt!: Date | null;

  @Column({ name: 'completed_at', type: 'datetime', nullable: true })
  completedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'requested_by' })
  requestedBy!: User;
}
