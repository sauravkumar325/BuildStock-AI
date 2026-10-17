import Decimal from 'decimal.js';
import { Op, Transaction } from 'sequelize';
import { db, Project, Material, StockTransaction, AuditLog } from '../models/index.js';
import { assert } from '../utils/errors.js';
import { projectAccess, visibleProjectIds } from '../middleware/auth.js';
export function balance(rows) { return rows.reduce((n,r)=>r.type==='IN'?n.plus(r.quantity):n.minus(r.quantity),new Decimal(0)); }
export function requireAvailable(current,quantity) { assert(new Decimal(current).gte(quantity),409,'Insufficient stock for this withdrawal.'); }
export async function recordStock(user,data,type) {
 return db.transaction({isolationLevel:Transaction.ISOLATION_LEVELS.READ_COMMITTED},async transaction=>{
  // Serializes every movement within this project, including first-ever stock.
  const project=await Project.findByPk(data.projectId,{transaction,lock:transaction.LOCK.UPDATE});
  assert(project,404,'Project not found.'); await projectAccess(user,project.id,transaction);
  const previous=await StockTransaction.findOne({where:{idempotencyKey:data.idempotencyKey},transaction});
  if(previous){ assert(previous.userId===user.id && previous.projectId===data.projectId && previous.materialId===data.materialId && previous.type===type && new Decimal(previous.quantity).eq(data.quantity) && previous.reason===data.reason,409,'This request key was already used for a different movement.');return previous; }
  assert(project.status==='active',409,'Completed projects do not accept stock movements.');
  const material=await Material.findByPk(data.materialId,{transaction,lock:transaction.LOCK.UPDATE});
  assert(material?.active,404,'Active material not found.');
  const rows=await StockTransaction.findAll({where:{projectId:project.id,materialId:material.id},transaction});
  const current=balance(rows); if(type==='OUT') requireAvailable(current,data.quantity);
  const after=type==='IN'?current.plus(data.quantity):current.minus(data.quantity);
  assert(after.lt('100000000000'),400,'Stock balance exceeds the supported range.');
  const movement=await StockTransaction.create({...data,type,userId:user.id,date:new Date().toISOString().slice(0,10),unitPrice:material.unitPrice},{transaction});
  await AuditLog.create({userId:user.id,projectId:project.id,materialId:material.id,action:`STOCK_${type}`,details:{transactionId:movement.id,quantity:data.quantity,balance:after.toFixed(3),reason:data.reason}},{transaction});
  return movement;
 });
}
export async function inventory(user,projectId) {
 const ids=projectId?[ (await projectAccess(user,projectId)).id ]:await visibleProjectIds(user);
 const [projects,materials,rows]=await Promise.all([
  Project.findAll({where:{id:{[Op.in]:ids}}}),Material.findAll({order:[['name','ASC']]}),
  StockTransaction.findAll({where:{projectId:{[Op.in]:ids}},order:[['id','ASC']]})]);
 const groups=new Map(); for(const r of rows){ const key=`${r.projectId}:${r.materialId}`;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(r); }
 const items=[];
 for(const project of projects) for(const material of materials){
  const movements=groups.get(`${project.id}:${material.id}`)||[];
  if(!material.active && !movements.length)continue;
  const quantity=balance(movements);
  items.push({projectId:project.id,project:project.name,projectStatus:project.status,materialId:material.id,material:material.name,sku:material.sku,category:material.category,unit:material.unit,active:material.active,quantity:quantity.toFixed(3),minimumStock:material.minimumStock,unitPrice:material.unitPrice,value:quantity.times(material.unitPrice).toFixed(2),lowStock:project.status==='active'&&material.active&&quantity.lte(material.minimumStock)});
 }
 return {items,rows,projects};
}
