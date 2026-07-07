import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity.js';

@Entity('login_sessions')
export class LoginSession {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'user_id', type: 'varchar' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Index({ unique: true })
  @Column({ name: 'jwt_id', type: 'varchar', length: 100, nullable: true })
  jwtId!: string | null;

  @Column({ name: 'refresh_token_hash', type: 'text', nullable: true })
  refreshTokenHash!: string | null;

  @Column({ name: 'ip_address', type: 'varchar', length: 50, nullable: true })
  ipAddress!: string | null;

  @Column({ name: 'browser', type: 'varchar', length: 255, nullable: true })
  browser!: string | null;

  @Column({ name: 'operating_system', type: 'varchar', length: 100, nullable: true })
  operatingSystem!: string | null;

  @Column({ name: 'login_time', type: 'datetime' })
  loginTime!: Date;

  @Column({ name: 'logout_time', type: 'datetime', nullable: true })
  logoutTime!: Date | null;

  @Column({ name: 'expires_at', type: 'datetime', nullable: true })
  expiresAt!: Date | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
