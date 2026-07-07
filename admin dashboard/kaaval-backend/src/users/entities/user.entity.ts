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
import { Role } from '../../auth/entities/role.entity.js';
import { District } from '../../districts/entities/district.entity.js';
import { Subdivision } from '../../subdivisions/entities/subdivision.entity.js';
import { Junction } from '../../junctions/entities/junction.entity.js';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 150, unique: true })
  username!: string;

  @Column({ name: 'password_hash', type: 'text' })
  passwordHash!: string;

  @Column({ name: 'full_name', type: 'varchar', length: 200 })
  fullName!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  designation!: string | null;

  @Column({ name: 'badge_number', type: 'varchar', length: 50, nullable: true })
  badgeNumber!: string | null;

  @Column({ name: 'employee_id', type: 'varchar', length: 50, nullable: true })
  employeeId!: string | null;

  @Column({ name: 'phone_number', type: 'varchar', length: 20, nullable: true })
  phoneNumber!: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  email!: string | null;

  // ── Foreign Keys ──────────────────────────────────────────────
  @Index()
  @Column({ name: 'role_id', type: 'varchar', nullable: true })
  roleId!: string | null;

  @Index()
  @Column({ name: 'district_id', type: 'varchar', nullable: true })
  districtId!: string | null;

  @Index()
  @Column({ name: 'subdivision_id', type: 'varchar', nullable: true })
  subdivisionId!: string | null;

  @Index()
  @Column({ name: 'junction_id', type: 'varchar', nullable: true })
  junctionId!: string | null;

  // ── Status & Auth Fields ──────────────────────────────────────
  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ name: 'requires_password_change', type: 'boolean', default: false })
  requiresPasswordChange!: boolean;

  @Column({ name: 'failed_login_attempts', type: 'int', default: 0 })
  failedLoginAttempts!: number;

  @Column({ name: 'locked_until', type: 'datetime', nullable: true })
  lockedUntil!: Date | null;

  @Column({ name: 'last_login', type: 'datetime', nullable: true })
  lastLogin!: Date | null;

  // ── Audit ─────────────────────────────────────────────────────
  @Column({ name: 'created_by', type: 'varchar', nullable: true })
  createdByUserId!: string | null;

  @Column({ name: 'updated_by', type: 'varchar', nullable: true })
  updatedByUserId!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  // ── Relations ─────────────────────────────────────────────────
  @ManyToOne(() => Role, (r) => r.users, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'role_id' })
  role!: Role | null;

  @ManyToOne(() => District, (d) => d.users, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'district_id' })
  district!: District | null;

  @ManyToOne(() => Subdivision, (s) => s.users, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'subdivision_id' })
  subdivision!: Subdivision | null;

  @ManyToOne(() => Junction, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'junction_id' })
  junction!: Junction | null;
}
