import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('login_otps')
export class LoginOtp {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'user_id', type: 'varchar' })
  userId!: string;

  @Column({ type: 'varchar', length: 100 })
  otp!: string; // Usually a hash, but user requested 'otp'

  @Column({ type: 'varchar', length: 50, default: 'LOGIN' })
  purpose!: string; // LOGIN, PASSWORD_RESET, EMAIL_VERIFICATION

  @Column({ name: 'expires_at', type: 'timestamp' })
  expiresAt!: Date;

  @Column({ name: 'used_at', type: 'timestamp', nullable: true })
  usedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
