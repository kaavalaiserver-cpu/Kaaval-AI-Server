import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Violation } from './violation.entity.js';
import { User } from '../../users/entities/user.entity.js';

@Entity('violation_reviews')
export class ViolationReview {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'violation_id', type: 'uuid' })
  violationId!: string;

  @Index()
  @Column({ name: 'reviewed_by', type: 'uuid' })
  reviewedByUserId!: string;

  @Column({ name: 'previous_status', type: 'varchar', length: 50 })
  previousStatus!: string;

  @Column({ name: 'new_status', type: 'varchar', length: 50 })
  newStatus!: string;

  @Column({ type: 'text', nullable: true })
  remarks!: string | null;

  @Column({ name: 'reviewed_at', type: 'timestamptz' })
  reviewedAt!: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  // ── Relations ─────────────────────────────────────────────────
  @ManyToOne(() => Violation, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'violation_id' })
  violation!: Violation;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'reviewed_by' })
  reviewedBy!: User;
}
