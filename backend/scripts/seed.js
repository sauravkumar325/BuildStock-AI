import {randomUUID} from 'node:crypto';
import {db,User,Project,Material,Membership,StockTransaction,AuditLog} from '../src/models/index.js';
// Explicit demo fixture, only allowed on an empty material/project database.
if(process.env.NODE_ENV==='production')throw new Error('Demo seeding is disabled in production.');
await db.transaction(async transaction=>{
 if(await Project.count({transaction})||await Material.count({transaction}))throw new Error('Seed requires an empty project/material database.');
 const user=await User.findOne({where:{role:'admin'},transaction});if(!user)throw new Error('Create an administrator first.');
 const projects=await Project.bulkCreate([{name:'Skyline Residences',location:'Pune, Maharashtra'},{name:'Riverside Commercial',location:'Mumbai, Maharashtra'}],{transaction});
 const materials=await Material.bulkCreate([{name:'OPC 53 Cement',sku:'CEM-053',category:'Cement',unit:'bags',unitPrice:390,minimumStock:200},{name:'TMT Steel 12 mm',sku:'STL-012',category:'Steel',unit:'kg',unitPrice:64,minimumStock:500},{name:'Red Clay Bricks',sku:'BRK-001',category:'Masonry',unit:'pieces',unitPrice:9,minimumStock:1000},{name:'River Sand',sku:'SND-001',category:'Aggregates',unit:'tonnes',unitPrice:1800,minimumStock:10}],{transaction});
 for(const project of projects){await Membership.create({userId:user.id,projectId:project.id},{transaction});
 for(let k=0;k<materials.length;k++){
 const material=materials[k],scale=[1,4,20,0.06][k];
 const initial=new Date();initial.setUTCDate(initial.getUTCDate()-35);
 await StockTransaction.create({projectId:project.id,materialId:material.id,userId:user.id,type:'IN',quantity:(2100*scale).toFixed(3),unitPrice:material.unitPrice,date:initial.toISOString().slice(0,10),reason:'DEMO opening balance',idempotencyKey:randomUUID()},{transaction});
 for(let day=34;day>=0;day--){const date=new Date();date.setUTCDate(date.getUTCDate()-day);const quantity=((day===0&&k===0&&project.id===projects[0].id?180:43+(day%7)*3)*scale).toFixed(3);
 await StockTransaction.create({projectId:project.id,materialId:material.id,userId:user.id,type:'OUT',quantity,unitPrice:material.unitPrice,date:date.toISOString().slice(0,10),reason:'DEMO scheduled site consumption',idempotencyKey:randomUUID()},{transaction});}
 }}
 await AuditLog.create({userId:user.id,action:'DEMO_SEEDED',details:{note:'Synthetic sample data; not actual project records.'}},{transaction});});console.log('Demo projects and 35 days of synthetic movements added.');await db.close();
