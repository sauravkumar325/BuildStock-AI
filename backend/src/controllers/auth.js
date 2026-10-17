import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { User, AuditLog, db } from '../models/index.js';
import { config } from '../config/env.js';
import { registerSchema, loginSchema } from '../utils/validation.js';
import { assert } from '../utils/errors.js';
const safe=u=>({id:u.id,name:u.name,email:u.email,role:u.role});
export async function register(req,res) {
 assert(config.registration,403,'Registration is disabled. Contact your administrator.');
 const data=registerSchema.parse(req.body);
 const user=await db.transaction(async transaction=>{
 const u=await User.create({name:data.name,email:data.email,passwordHash:await bcrypt.hash(data.password,12),role:'viewer'},{transaction});
 await AuditLog.create({userId:u.id,action:'USER_REGISTERED',details:{role:'viewer'}},{transaction});return u;});
 res.status(201).json({user:safe(user),message:'Account created. An administrator must assign you to a project.'});
}
export async function login(req,res) {
 const data=loginSchema.parse(req.body);const user=await User.unscoped().findOne({where:{email:data.email}});
 const valid=user && await bcrypt.compare(data.password,user.passwordHash);
 assert(valid&&user.active,401,'Incorrect email or password.');
 const token=jwt.sign({},config.secret,{subject:String(user.id),expiresIn:'8h',algorithm:'HS256',issuer:'buildstock',audience:'buildstock-web'});
 res.cookie('bs_token',token,{httpOnly:true,secure:config.production,sameSite:'strict',maxAge:8*3600*1000,path:'/'});
 res.json({user:safe(user)});
}
export function logout(req,res){res.clearCookie('bs_token',{httpOnly:true,secure:config.production,sameSite:'strict',path:'/'});res.json({message:'Logged out.'});}
