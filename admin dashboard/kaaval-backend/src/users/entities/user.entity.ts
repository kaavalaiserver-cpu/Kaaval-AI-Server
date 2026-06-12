import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Role } from '../../auth/roles.enum.js';
import { getTimestampColumnType } from '../../common/database.utils.js';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  username!: string;

  @Column({ name: 'password_hash' })
  passwordHash!: string;

  @Column({ name: 'full_name' })
  fullName!: string;

  @Column({ nullable: true })
  designation!: string;

  @Column({ name: 'subdivision', nullable: true })
  subdivision!: string;

  @Column({ name: 'phone_number', nullable: true })
  phoneNumber!: string;

  @Column({ name: 'email', nullable: true })
  email!: string;

  @Column({ name: 'created_by', nullable: true })
  createdBy!: string;

  @Column({ name: 'updated_by', nullable: true })
  updatedBy!: string;

  @Column({ name: 'failed_login_attempts', default: 0 })
  failedLoginAttempts!: number;

  @Column({ name: 'locked_until', type: getTimestampColumnType(), nullable: true })
  lockedUntil!: Date | null;

  @Column({
    type: 'varchar',
    default: Role.VIEWER,
  })
  role!: Role;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @Column({ name: 'requires_password_change', default: false })
  requiresPasswordChange!: boolean;

  @Column({ name: 'last_login', nullable: true })
  lastLogin!: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
