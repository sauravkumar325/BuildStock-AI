import { z } from 'zod';
const label = n => z.string().trim().min(1).max(n);
const amount = (scale,positive=false) => z.union([z.string(),z.number()]).transform(String).refine(v => /^\d+(\.\d+)?$/.test(v) && Number.isFinite(Number(v)) && Number(v)<1e10 && (positive?Number(v)>0:Number(v)>=0) && (v.split('.')[1]?.length||0)<=scale, `Use a ${positive?'positive':'non-negative'} number with up to ${scale} decimal places`);
export const idSchema = z.coerce.number().int().positive().max(4294967295);
export const password = z.string().min(10).max(72).refine(v=>Buffer.byteLength(v,'utf8')<=72,'Password must fit in 72 UTF-8 bytes');
export const registerSchema=z.object({name:label(160),email:z.string().email().max(254).transform(v=>v.toLowerCase()),password}).strict();
export const loginSchema=z.object({email:z.string().email().transform(v=>v.toLowerCase()),password:z.string().min(1).max(200)}).strict();
export const projectSchema=z.object({name:label(160),location:label(255),status:z.enum(['active','completed']).default('active')}).strict();
export const materialSchema=z.object({name:label(160),sku:label(60),category:label(80),unit:label(30),unitPrice:amount(2),minimumStock:amount(3)}).strict();
export const stockSchema=z.object({projectId:idSchema,materialId:idSchema,quantity:amount(3,true),reason:label(500),idempotencyKey:z.string().uuid()}).strict();
export const roleSchema=z.object({role:z.enum(['admin','manager','storekeeper','viewer'])}).strict();
export const memberSchema=z.object({userId:idSchema}).strict();
export function queryId(v) { return v===undefined || v==='' ? undefined : idSchema.parse(v); }
export function pageQuery(q) { return {page:z.coerce.number().int().min(1).default(1).parse(q.page),limit:z.coerce.number().int().min(1).max(100).default(50).parse(q.limit)}; }
