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
import { Subdivision } from '../../subdivisions/entities/subdivision.entity.js';

@Entity('reports')
export class Report {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'report_name', type: 'varchar', length: 255 })
  reportName!: string;

  @Column({ name: 'report_type', type: 'varchar', length: 50 })
  reportType!: string; // DAILY, WEEKLY, MONTHLY, CUSTOM

  @Index()
  @Column({ name: 'generated_by', type: 'varchar', nullable: true })
  generatedByUserId!: string | null;

  @Column({ name: 'from_date', type: 'date', nullable: true })
  fromDate!: string | null;

  @Column({ name: 'to_date', type: 'date', nullable: true })
  toDate!: string | null;

  @Index()
  @Column({ name: 'subdivision_id', type: 'varchar', nullable: true })
  subdivisionId!: string | null;

  @Column({ name: 'file_path', type: 'text', nullable: true })
  filePath!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  // ── Relations ─────────────────────────────────────────────────
  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'generated_by' })
  generatedBy!: User | null;

  @ManyToOne(() => Subdivision, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'subdivision_id' })
  subdivision!: Subdivision | null;
}
