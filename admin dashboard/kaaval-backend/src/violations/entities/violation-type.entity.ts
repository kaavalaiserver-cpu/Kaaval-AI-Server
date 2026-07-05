import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('violation_types')
export class ViolationType {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'violation_code', type: 'varchar', length: 50, unique: true })
  violationCode!: string;

  @Column({ name: 'violation_name', type: 'varchar', length: 150 })
  violationName!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ name: 'default_fine', type: 'decimal', precision: 10, scale: 2, default: 500 })
  defaultFine!: number;

  @Column({ type: 'varchar', length: 20, nullable: true })
  color!: string | null;

  @Column({ type: 'varchar', length: 50, default: 'MODERATE' })
  severity!: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
