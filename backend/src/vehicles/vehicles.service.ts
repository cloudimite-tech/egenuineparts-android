import { Injectable, NotFoundException } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { db } from '../db/client';
import { vehicles } from '../db/schema';
import { CreateVehicleDto } from './dto/vehicle.dto';

@Injectable()
export class VehiclesService {
  list(userId: string) {
    return db.query.vehicles.findMany({ where: eq(vehicles.userId, userId) });
  }

  async create(userId: string, dto: CreateVehicleDto) {
    const count = (await this.list(userId)).length;
    if (count === 0) dto.isDefault = true;
    if (dto.isDefault) {
      await db.update(vehicles).set({ isDefault: false }).where(eq(vehicles.userId, userId));
    }
    const [vehicle] = await db
      .insert(vehicles)
      .values({ ...dto, userId })
      .returning();
    return vehicle;
  }

  async setDefault(userId: string, id: string) {
    const existing = await db.query.vehicles.findFirst({
      where: and(eq(vehicles.id, id), eq(vehicles.userId, userId)),
    });
    if (!existing) throw new NotFoundException('Vehicle not found.');
    await db.update(vehicles).set({ isDefault: false }).where(eq(vehicles.userId, userId));
    await db.update(vehicles).set({ isDefault: true }).where(eq(vehicles.id, id));
    return this.list(userId);
  }

  async remove(userId: string, id: string) {
    const existing = await db.query.vehicles.findFirst({
      where: and(eq(vehicles.id, id), eq(vehicles.userId, userId)),
    });
    if (!existing) throw new NotFoundException('Vehicle not found.');
    await db.delete(vehicles).where(eq(vehicles.id, id));
    return { success: true };
  }
}
