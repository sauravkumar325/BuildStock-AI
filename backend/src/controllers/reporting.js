import { Op } from 'sequelize';
import Decimal from 'decimal.js';
import { StockTransaction,AuditLog,Material,Project,User } from '../models/index.js';
import { queryId,pageQuery } from '../utils/validation.js';
import { visibleProjectIds,projectAccess } from '../middleware/auth.js';
import { inventory,recordStock } from '../services/stock.js';
import { stockSchema } from '../utils/validation.js';
import { assert } from '../utils/errors.js';
import { config } from '../config/env.js';
export const stock=type=>async(req,res)=>res.status(201).json(await recordStock(req.user,stockSchema.parse(req.body),type));
export async function stockHistory(req,res){
 const projectId=queryId(req.query.projectId);const ids=projectId?[(await projectAccess(req.user,projectId)).id]:await visibleProjectIds(req.user);
 const {page,limit}=pageQuery(req.query);const where={projectId:{[Op.in]:ids}};
 if(req.query.materialId)where.materialId=queryId(req.query.materialId);
 const result=await StockTransaction.findAndCountAll({where,include:[Material,Project,{model:User,attributes:['id','name']}],order:[['id','DESC']],limit,offset:(page-1)*limit});
 res.json({items:result.rows,total:result.count,page,limit});
}
export async function stockInventory(req,res){res.json((await inventory(req.user,queryId(req.query.projectId))).items);}
export async function dashboard(req,res){
 const {items,rows,projects}=await inventory(req.user,queryId(req.query.projectId));
 const today=new Date().toISOString().slice(0,10);const days=Array.from({length:14},(_,i)=>{const d=new Date(today);d.setUTCDate(d.getUTCDate()-13+i);return d.toISOString().slice(0,10);});
 const movement=days.map(date=>({date,inValue:rows.filter(r=>r.date===date&&r.type==='IN').reduce((s,r)=>s.plus(new Decimal(r.quantity).times(r.unitPrice)),new Decimal(0)).toFixed(2),outValue:rows.filter(r=>r.date===date&&r.type==='OUT').reduce((s,r)=>s.plus(new Decimal(r.quantity).times(r.unitPrice)),new Decimal(0)).toFixed(2)}));
 res.json({totalMaterials:new Set(items.filter(i=>i.active).map(i=>i.materialId)).size,projects:projects.length,lowStockCount:items.filter(i=>i.lowStock).length,inventoryValue:items.reduce((s,i)=>s.plus(i.value),new Decimal(0)).toFixed(2),lowStock:items.filter(i=>i.lowStock),movement});
}
function csvCell(value){let v=String(value??'');if(/^[=+@\-\t\r]/.test(v))v="'"+v;return '"'+v.replaceAll('"','""')+'"';}
export async function reports(req,res){
 const data=await inventory(req.user,queryId(req.query.projectId));
 const items=data.items.map(i=>({...i,consumed:data.rows.filter(r=>r.projectId===i.projectId&&r.materialId===i.materialId&&r.type==='OUT').reduce((s,r)=>s.plus(r.quantity),new Decimal(0)).toFixed(3)}));
 if(req.query.format==='csv'){
 const columns=['project','material','sku','unit','quantity','minimumStock','unitPrice','value','consumed'];
 res.type('text/csv').attachment('buildstock-inventory.csv').send([columns,...items.map(i=>columns.map(k=>i[k]))].map(row=>row.map(csvCell).join(',')).join('\r\n'));return;
 }res.json({generatedAt:new Date().toISOString(),valuationMethod:'Current catalog price × quantity; consumption is all-time.',items});
}
export async function audits(req,res){
 const {page,limit}=pageQuery(req.query);const projectId=queryId(req.query.projectId);
 const ids=projectId?[(await projectAccess(req.user,projectId)).id]:await visibleProjectIds(req.user);
 const where=req.user.role==='admin'&&!projectId?{}:{projectId:{[Op.in]:ids}};
 const result=await AuditLog.findAndCountAll({where,include:[{model:User,attributes:['id','name']},Project,Material],order:[['id','DESC']],limit,offset:(page-1)*limit});res.json({items:result.rows,total:result.count,page,limit});
}
export async function intelligence(req,res){
 const {items,rows}=await inventory(req.user,queryId(req.query.projectId));
 const today=new Date().toISOString().slice(0,10);
 const series=items.filter(i=>i.active&&i.projectStatus==='active').map(i=>{
  const relevant=rows.filter(r=>r.projectId===i.projectId&&r.materialId===i.materialId);
  const start=relevant.length?relevant.reduce((a,r)=>r.date<a?r.date:a,today):today;
  const days=Math.min(90,Math.max(0,Math.round((new Date(today)-new Date(start))/86400000)));
  const history=Array.from({length:days},(_,j)=>{const d=new Date(today);d.setUTCDate(d.getUTCDate()-days+j);const date=d.toISOString().slice(0,10);return {date,quantity:relevant.filter(r=>r.type==='OUT'&&r.date===date).reduce((s,r)=>s.plus(r.quantity),new Decimal(0)).toNumber()};});
  return {key:`${i.projectId}:${i.materialId}`,currentStock:Number(i.quantity),safetyStock:Number(i.minimumStock),history,todayUsage:relevant.filter(r=>r.type==='OUT'&&r.date===today).reduce((s,r)=>s.plus(r.quantity),new Decimal(0)).toNumber()};
 });
 let predictions=[],available=true;
 try {
 assert(config.mlKey,503,'ML key missing');
 const response=await fetch(`${config.mlUrl}/predict`,{method:'POST',headers:{'Content-Type':'application/json','X-API-Key':config.mlKey},body:JSON.stringify({horizon:7,series}),signal:AbortSignal.timeout(10000)});
 if(!response.ok)throw new Error('ML unavailable');const result=await response.json();assert(Array.isArray(result.predictions),503,'Invalid ML response');predictions=result.predictions;
 }catch{available=false;}
 const forecasts=predictions.map(p=>({...items.find(i=>`${i.projectId}:${i.materialId}`===p.key),...p}));
 const alerts=items.filter(i=>i.lowStock).map(i=>({type:'low_stock',severity:'warning',project:i.project,material:i.material,message:`${i.quantity} ${i.unit} available; minimum ${i.minimumStock}.`}));
 for(const f of forecasts){if(f.status==='ready'&&f.shortage>0)alerts.push({type:'predicted_shortage',severity:'warning',project:f.project,material:f.material,message:`Estimated 7-day shortage: ${f.shortage} ${f.unit}.`});if(f.anomaly)alerts.push({type:'unusual_consumption',severity:'review',project:f.project,material:f.material,message:`Today's consumption is unusually high. Review the movements; no cause is assumed.`});}
 res.json({available,forecasts,alerts,message:available?'Forecasts are estimates based on recorded consumption.':'Prediction service unavailable. Inventory and low-stock alerts remain available.'});
}
