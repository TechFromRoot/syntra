import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import * as mongoose from 'mongoose';

export type TrackedWalletDocument = mongoose.HydratedDocument<TrackedWallet>;

@Schema()
export class TrackedWallet {
  @Prop({ unique: true })
  walletAddress: string;

  @Prop()
  chatIds: number[];
}

export const TrackedWalletSchema = SchemaFactory.createForClass(TrackedWallet);
