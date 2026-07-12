import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Device } from './device.entity.js';

@Entity('device_network')
export class DeviceNetwork {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index({ unique: true })
  @Column({ name: 'device_id', type: 'varchar' })
  deviceId!: string;

  @Column({ name: 'local_ip', type: 'varchar', length: 50, nullable: true })
  localIp!: string | null;

  @Column({ name: 'forwarded_port', type: 'int', nullable: true })
  forwardedPort!: number | null;

  @Column({ name: 'api_endpoint', type: 'varchar', length: 255, nullable: true })
  apiEndpoint!: string | null;

  @Column({ name: 'mac_address', type: 'varchar', length: 50, nullable: true })
  macAddress!: string | null;

  @Column({ name: 'network_type', type: 'varchar', length: 20, nullable: true })
  networkType!: string | null; // LAN, ETHERNET, Wi-Fi, VPN

  @Column({ name: 'last_ping', type: 'timestamp', nullable: true })
  lastPing!: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @OneToOne(() => Device, (d) => d.network, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'device_id' })
  device!: Device;
}
