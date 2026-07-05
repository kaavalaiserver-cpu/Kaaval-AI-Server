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
import { District } from '../../districts/entities/district.entity.js';
import { Junction } from '../../junctions/entities/junction.entity.js';
import { User } from '../../users/entities/user.entity.js';

@Entity('subdivisions')
export class Subdivision {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'district_id', type: 'uuid' })
  districtId!: string;

  @Column({ name: 'subdivision_name', type: 'varchar', length: 150 })
  subdivisionName!: string;

  @Column({ name: 'subdivision_code', type: 'varchar', length: 50, nullable: true })
  subdivisionCode!: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  headquarters!: string | null;

  @Column({ name: 'polygon_coordinates', type: 'jsonb', nullable: true })
  polygonCoordinates!: any | null; // e.g. [[lng, lat], [lng, lat], ...]

  @Column({ type: 'varchar', length: 20, default: 'ACTIVE' })
  status!: string; // ACTIVE, INACTIVE

  @ManyToOne(() => District, (d) => d.subdivisions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'district_id' })
  district!: District;

  @OneToMany(() => Junction, (j) => j.subdivision)
  junctions!: Junction[];

  @OneToMany(() => User, (u) => u.subdivision)
  users!: User[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
