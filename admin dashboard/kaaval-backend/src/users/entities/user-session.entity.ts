import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('user_sessions')
export class UserSession {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id' })
  userId!: string;

  @Column({ name: 'login_time' })
  loginTime!: Date;

  @Column({ name: 'logout_time', nullable: true })
  logoutTime!: Date;

  @Column({ name: 'ip_address', nullable: true })
  ipAddress!: string;

  @Column({ name: 'device_info', nullable: true })
  deviceInfo!: string;
}
