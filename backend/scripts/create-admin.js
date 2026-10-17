import bcrypt from 'bcrypt';
import {db,User,AuditLog} from '../src/models/index.js';
import {registerSchema} from '../src/utils/validation.js';
const data=registerSchema.parse({name:process.env.ADMIN_NAME,email:process.env.ADMIN_EMAIL,password:process.env.ADMIN_PASSWORD});
await db.transaction(async transaction=>{
 if(await User.count({where:{email:data.email},transaction}))throw new Error('Email already exists. No account was changed.');
 const user=await User.create({name:data.name,email:data.email,passwordHash:await bcrypt.hash(data.password,12),role:'admin'},{transaction});
 await AuditLog.create({userId:user.id,action:'ADMIN_BOOTSTRAPPED',details:{}},{transaction});});
console.log('Administrator created. Remove ADMIN_PASSWORD from your environment.');await db.close();
