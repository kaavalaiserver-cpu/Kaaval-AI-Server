import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Junction } from '../../junctions/entities/junction.entity.js';
import { Device } from '../../devices/entities/device.entity.js';
import { CameraSettings } from './camera-settings.entity.js';
import { CameraStorage } from './camera-storage.entity.js';
import { CameraEvent } from './camera-event.entity.js';
import { Violation } from '../../violations/entities/violation.entity.js';

@Entity('cameras')
export class Camera {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'junction_id', type: 'uuid' })
  junctionId!: string;

  @Column({ name: 'camera_name', type: 'varchar', length: 200 })
  cameraName!: string;

  @Column({ name: 'camera_code', type: 'varchar', length: 50, unique: true })
  cameraCode!: string; // KAI-CAM-001

  @Column({ name: 'camera_direction', type: 'varchar', length: 50, nullable: true })
  cameraDirection!: string | null; // NORTH, SOUTH, EAST, WEST, ENTRY, EXIT, CENTER

  @Column({ name: 'rtsp_url', type: 'text', nullable: true })
  rtspUrl!: string | null;

  @Column({ name: 'device_ip', type: 'varchar', length: 50, nullable: true })
  deviceIp!: string | null;

  @Column({ name: 'forwarded_port', type: 'int', nullable: true })
  forwardedPort!: number | null;

  @Column({ name: 'installation_height', type: 'float', nullable: true })
  installationHeight!: number | null;

  @Column({ name: 'installation_date', type: 'date', nullable: true })
  installationDate!: string | null;

  @Column({ type: 'varchar', length: 20, default: 'OFFLINE' })
  status!: string; // ONLINE, OFFLINE, NO_STREAM, MAINTENANCE, ERROR, BOOTING

  @Column({ name: 'last_seen', type: 'timestamptz', nullable: true })
  lastSeen!: Date | null;

  @Column({ type: 'text', nullable: true })
  remarks!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  // ── Relations ─────────────────────────────────────────────────
  @ManyToOne(() => Junction, (j) => j.cameras, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'junction_id' })
  junction!: Junction;

  @OneToOne(() => Device, (d) => d.camera)
  device!: Device;

  @OneToOne(() => CameraSettings, (s) => s.camera)
  settings!: CameraSettings;

  @OneToOne(() => CameraStorage, (s) => s.camera)
  storage!: CameraStorage;

  @OneToMany(() => CameraEvent, (e) => e.camera)
  events!: CameraEvent[];

  @OneToMany(() => Violation, (v) => v.camera)
  violations!: Violation[];
}
