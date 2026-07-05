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

@Entity('evidence')
export class Evidence {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'violation_id', type: 'uuid' })
  violationId!: string;

  @Column({ name: 'evidence_type', type: 'varchar', length: 50 })
  evidenceType!: string; // RAW_IMAGE, ANNOTATED_IMAGE, PLATE_CROP, VIDEO, SCREENSHOT, PDF_REPORT

  @Column({ name: 'file_path', type: 'text' })
  filePath!: string;

  @Column({ type: 'varchar', length: 128, nullable: true })
  checksum!: string | null;

  @Column({ name: 'file_size', type: 'bigint', nullable: true })
  fileSize!: number | null;

  @Column({ name: 'captured_at', type: 'timestamptz', nullable: true })
  capturedAt!: Date | null;

  @CreateDateColumn({ name: 'uploaded_at' })
  uploadedAt!: Date;

  @ManyToOne(() => Violation, (v) => v.evidence, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'violation_id' })
  violation!: Violation;
}
