import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import * as mongoose from 'mongoose';

export type UserDocument = mongoose.HydratedDocument<User>;

@Schema()
export class User {
  @Prop({ unique: true })
  chatId: number;

  @Prop()
  userName: string;

  @Prop()
  solWalletAddress: string;

  @Prop()
  solWalletDetails: string;

  @Prop()
  linkCode: string;

  @Prop({ default: 10 })
  buySlippage: string;

  @Prop({ default: 10 })
  sellSlippage: string;

  @Prop({ default: 10000 })
  buyAlertAmount: string;

  @Prop({ default: 10000 })
  sellAlertAmount: string;

  @Prop({ default: false })
  tracking: boolean;
}

export const UserSchema = SchemaFactory.createForClass(User);
