import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum WatchlistStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export enum WatchlistPriority {
  CRITICAL = 'CRITICAL', // e.g. Stolen
  HIGH = 'HIGH',       // e.g. Suspicious
  MEDIUM = 'MEDIUM',     // e.g. Repeat Offender
  LOW = 'LOW',         // e.g. Monitor
}

@Entity('watchlist')
export class Watchlist {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  vehicleNumber: string;

  @Column({ type: 'text', nullable: true })
  reason: string;

  @Column({
    type: 'simple-enum',
    enum: WatchlistPriority,
    default: WatchlistPriority.MEDIUM,
  })
  priority: WatchlistPriority;

  @Column({
    type: 'simple-enum',
    enum: WatchlistStatus,
    default: WatchlistStatus.ACTIVE,
  })
  status: WatchlistStatus;

  @Column({ type: 'text', nullable: true })
  addedBy: string;

  @CreateDateColumn()
  addedAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}