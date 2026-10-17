import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { User, Project, Membership } from '../models/index.js';
import { assert } from '../utils/errors.js';
export async function authenticate(req,res,next) {
 const token=req.cookies.bs_token || (req.headers.authorization?.startsWith('Bearer ')? req.headers.authorization.slice(7):'');
 let payload; try { payload=jwt.verify(token,config.secret,{algorithms:['HS256'],issuer:'buildstock',audience:'buildstock-web'}); } catch { return res.status(401).json({error:'Please log in again.'}); }
 req.user=await User.findByPk(payload.sub); assert(req.user?.active,401,'Account unavailable.'); next();
}
export const roles=(...allowed)=>(req,res,next)=>{assert(allowed.includes(req.user.role),403,'Your role cannot perform this action.');next();};
export async function projectAccess(user,id,transaction) {
 const project=await Project.findByPk(id,{transaction}); assert(project,404,'Project not found.');
 if(user.role!=='admin') assert(await Membership.findOne({where:{userId:user.id,projectId:id},transaction}),403,'You are not assigned to this project.');
 return project;
}
export async function visibleProjectIds(user) {
 const rows=user.role==='admin'?await Project.findAll({attributes:['id']}):await Membership.findAll({where:{userId:user.id},attributes:['projectId']});
 return rows.map(r=>user.role==='admin'?r.id:r.projectId);
}
export function checkOrigin(req,res,next) {
 if(!['GET','HEAD','OPTIONS'].includes(req.method) && req.cookies.bs_token) {
 assert(req.headers.origin===config.origin,403,'Request origin is not allowed.');
 }
 next();
}
