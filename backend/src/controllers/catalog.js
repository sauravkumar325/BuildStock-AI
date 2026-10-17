import { Op } from 'sequelize';
import Decimal from 'decimal.js';
import { db,Project,Membership,Material,User,AuditLog,StockTransaction } from '../models/index.js';
import { projectAccess,visibleProjectIds } from '../middleware/auth.js';
import { projectSchema,materialSchema,idSchema,memberSchema,roleSchema } from '../utils/validation.js';
import { assert } from '../utils/errors.js';
import { balance } from '../services/stock.js';
export async function projects(req,res){res.json(await Project.findAll({where:{id:{[Op.in]:await visibleProjectIds(req.user)}},order:[['createdAt','DESC']]}));}
export async function saveProject(req,res){
 const data=projectSchema.parse(req.body);const id=req.params.id&&idSchema.parse(req.params.id);
 const result=await db.transaction(async transaction=>{
 let row;
 if(id){row=await Project.findByPk(id,{transaction,lock:transaction.LOCK.UPDATE});assert(row,404,'Project not found.');await projectAccess(req.user,id,transaction);await row.update(data,{transaction});}
 else {row=await Project.create(data,{transaction});await Membership.create({projectId:row.id,userId:req.user.id},{transaction});}
 await AuditLog.create({userId:req.user.id,projectId:row.id,action:id?'PROJECT_UPDATED':'PROJECT_CREATED',details:data},{transaction});return row;
 });res.status(id?200:201).json(result);
}
export async function members(req,res){const p=await projectAccess(req.user,idSchema.parse(req.params.id));res.json(await p.getUsers({attributes:['id','name','email','role'],joinTableAttributes:[]}));}
export async function addMember(req,res){
 const projectId=idSchema.parse(req.params.id),{userId}=memberSchema.parse(req.body);
 await db.transaction(async transaction=>{
 await projectAccess(req.user,projectId,transaction);assert(await User.findByPk(userId,{transaction}),404,'User not found.');
 await Membership.findOrCreate({where:{userId,projectId},transaction});
 await AuditLog.create({userId:req.user.id,projectId,action:'MEMBER_ASSIGNED',details:{memberId:userId}},{transaction});});
 res.json({message:'Member assigned.'});
}
export async function removeMember(req,res){
 const projectId=idSchema.parse(req.params.id),userId=idSchema.parse(req.params.userId);
 await db.transaction(async transaction=>{await projectAccess(req.user,projectId,transaction);await Membership.destroy({where:{projectId,userId},transaction});await AuditLog.create({userId:req.user.id,projectId,action:'MEMBER_REMOVED',details:{memberId:userId}},{transaction});});res.json({message:'Assignment removed.'});
}
export async function materials(req,res){res.json(await Material.findAll({where:req.query.archived==='true'?{}:{active:true},order:[['name','ASC']]}));}
export async function saveMaterial(req,res){
 const data=materialSchema.parse(req.body),id=req.params.id&&idSchema.parse(req.params.id);
 const result=await db.transaction(async transaction=>{
 let row;if(id){row=await Material.findByPk(id,{transaction,lock:transaction.LOCK.UPDATE});assert(row?.active,404,'Active material not found.');
 if(row.unit!==data.unit)assert(await StockTransaction.count({where:{materialId:id},transaction})===0,409,'Units cannot change once a material has stock history.');
 await row.update(data,{transaction});}else row=await Material.create(data,{transaction});
 await AuditLog.create({userId:req.user.id,materialId:row.id,action:id?'MATERIAL_UPDATED':'MATERIAL_CREATED',details:data},{transaction});return row;
 });res.status(id?200:201).json(result);
}
export async function archiveMaterial(req,res){
 const id=idSchema.parse(req.params.id);
 await db.transaction(async transaction=>{
 const row=await Material.findByPk(id,{transaction,lock:transaction.LOCK.UPDATE});assert(row?.active,404,'Active material not found.');
 const history=await StockTransaction.findAll({where:{materialId:id},transaction});const groups=new Map();
 for(const item of history){if(!groups.has(item.projectId))groups.set(item.projectId,[]);groups.get(item.projectId).push(item);}
 assert([...groups.values()].every(rows=>balance(rows).eq(0)),409,'Withdraw remaining stock from every project before archiving.');
 await row.update({active:false},{transaction});await AuditLog.create({userId:req.user.id,materialId:id,action:'MATERIAL_ARCHIVED',details:{name:row.name}},{transaction});});
 res.json({message:'Material archived; history retained.'});
}
export async function users(req,res){res.json(await User.findAll({order:[['name','ASC']]}));}
export async function changeRole(req,res){
 const id=idSchema.parse(req.params.id),data=roleSchema.parse(req.body);assert(id!==req.user.id,400,'You cannot change your own role.');
 await db.transaction(async transaction=>{const u=await User.findByPk(id,{transaction,lock:transaction.LOCK.UPDATE});assert(u,404,'User not found.');const before=u.role;await u.update(data,{transaction});await AuditLog.create({userId:req.user.id,action:'USER_ROLE_CHANGED',details:{targetUserId:id,before,after:data.role}},{transaction});});res.json({message:'Role updated.'});
}
