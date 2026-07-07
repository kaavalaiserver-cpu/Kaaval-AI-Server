import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { Subdivision } from '../../subdivisions/entities/subdivision.entity.js';
import { Camera } from '../../cameras/entities/camera.entity.js';
import { User } from '../../users/entities/user.entity.js';

@Entity('junctions')
export class Junction {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'subdivision_id', type: 'varchar' })
  subdivisionId!: string;

  @Column({ name: 'junction_name', type: 'varchar', length: 200 })
  junctionName!: string;

  @Column({ name: 'junction_code', type: 'varchar', length: 50, nullable: true })
  junctionCode!: string | null;

  @Column({ type: 'text', nullable: true })
  address!: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  latitude!: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  longitude!: number | null;

  @Column({ name: 'junction_type', type: 'varchar', length: 50, default: 'ROUNDANA' })
  junctionType!: string; // ROUNDANA, SIGNAL, HIGHWAY, CHECKPOST

  @Column({ name: 'speed_limit', type: 'int', nullable: true })
  speedLimit!: number | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @ManyToOne(() => Subdivision, (s) => s.junctions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'subdivision_id' })
  subdivision!: Subdivision;

  @OneToMany(() => Camera, (c) => c.junction)
  cameras!: Camera[];

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  createdBy!: User | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
