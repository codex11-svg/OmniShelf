import { z } from "zod";

const identifier = z.string().trim().min(1).max(128);
const phone = z.string().trim().regex(/^\+?[0-9\s-]{9,18}$/);
const expiryDate = z.string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  })
  .optional();

export const createMerchantInputSchema = z.object({
  storeName: z.string().trim().min(1).max(120),
  storeType: z.enum(["KIRANA", "MEDICAL"]),
  ownerName: z.string().trim().min(1).max(120),
  address: z.string().trim().min(1).max(400),
  city: z.string().trim().min(1).max(100),
  pincode: z.string().trim().min(3).max(12),
  phone,
  licenseNumber: z.string().trim().max(100).optional(),
  licenseDocUrl: z.string().trim().max(512).optional(),
});

export const createMerchantForAdminInputSchema = z.object({
  type: z.enum(["KIRANA", "MEDICAL"]),
  name: z.string().trim().min(1).max(120),
  ownerName: z.string().trim().min(1).max(120),
  phone,
  whatsapp: phone,
  address: z.string().trim().min(1).max(400),
  city: z.string().trim().min(1).max(100),
  pincode: z.string().trim().min(3).max(12),
  licenseNumber: z.string().trim().min(1).max(100),
  licenseDocUrl: z.string().trim().max(512).optional(),
  notes: z.string().trim().max(2000).optional(),
});

export const posSaleInputSchema = z.object({
  items: z.array(z.object({
    productId: identifier,
    quantity: z.number().int().min(1).max(1_000_000),
  })).min(1).max(100),
  patientName: z.string().trim().max(120).optional(),
  doctorName: z.string().trim().max(120).optional(),
  prescriptionKey: z.string().trim().max(512).optional(),
});

const productFields = {
  name: z.string().trim().min(1).max(160),
  brand: z.string().trim().max(120).optional(),
  category: z.string().trim().min(1).max(100),
  barcode: z.string().trim().max(64).optional(),
  mrp: z.number().finite().positive().max(99_999_999.99),
  costPrice: z.number().finite().min(0).max(99_999_999.99),
  quantity: z.number().int().min(0).max(2_147_483_647),
  reorderThreshold: z.number().int().min(0).max(2_147_483_647),
  batchNumber: z.string().trim().max(100).optional(),
  expiryDate,
  scheduleClass: z.enum(["OTC", "SCHEDULE_H", "SCHEDULE_H1", "SCHEDULE_X"]).optional(),
  requiresPrescription: z.boolean().optional(),
};

export const addInventoryProductInputSchema = z.object({
  ...productFields,
  imageUrl: z.string().trim().max(2048).optional(),
});

export const updateProductDetailsInputSchema = z.object({
  ...productFields,
  clearanceDiscountPct: z.number().int().min(0).max(90).optional(),
  pushToMarketplace: z.boolean().optional(),
});

export const createOrderInputSchema = z.object({
  merchantId: identifier,
  items: z.array(z.object({
    productId: identifier,
    productName: z.string().trim().min(1).max(200),
    quantity: z.number().int().min(1).max(100_000),
    price: z.number().finite().min(0).max(99_999_999.99),
  })).min(1).max(50),
  deliveryAddress: z.string().trim().min(5).max(500),
  deliveryPhone: phone,
  consumerName: z.string().trim().min(1).max(120),
  notes: z.string().trim().max(1000).optional(),
});