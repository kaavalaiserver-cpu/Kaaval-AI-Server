import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('violations')
export class Violation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @Column({ name: 'image_url', type: 'text', nullable: true })
  imageUrl!: string | null;

  @Column({ name: 'proof_img_url', type: 'text', nullable: true })
  proofImgUrl!: string | null;

  @Column({ type: 'simple-json', nullable: true })
  detections!: Record<string, unknown> | null;

  @Column({ name: 'vehicle_number', type: 'varchar', length: 50, nullable: true })
  vehicleNumber!: string | null;

  @Column({ name: 'violation_type', type: 'varchar', length: 100, default: 'NO_HELMET' })
  violationType!: string;

  @Column({ name: 'confidence_score', type: 'float', default: 0 })
  confidenceScore!: number;

  @Column({ name: 'challan_status', type: 'varchar', length: 50, nullable: true })
  challanStatus!: string | null;

  @Column({ name: 'challan_amount', type: 'int', nullable: true })
  challanAmount!: number | null;

  @Column({ name: 'challan_issued_at', type: 'datetime', nullable: true })
  challanIssuedAt!: Date | null;

  @Column({ type: 'varchar', length: 50, default: 'PENDING' })
  status!: string;

  @Column({ name: 'location_lat', type: 'float', nullable: true })
  locationLat!: number | null;

  @Column({ name: 'location_lng', type: 'float', nullable: true })
  locationLng!: number | null;

  @Column({ type: 'simple-json', nullable: true })
  metadata!: Record<string, unknown> | null;

  @Column({ name: 'reviewed_by', type: 'varchar', length: 100, nullable: true })
  reviewedBy!: string | null;

  @Column({ name: 'reviewed_at', type: 'datetime', nullable: true })
  reviewedAt!: Date | null;

  @Column({ name: 'review_notes', type: 'text', nullable: true })
  reviewNotes!: string | null;

  @Column({ name: 'camera_id', type: 'varchar', length: 50, nullable: true })
  cameraId!: string | null;

  @Column({ name: 'vehicle_detection_id', type: 'varchar', length: 100, nullable: true })
  vehicleDetectionId!: string | null;
}
