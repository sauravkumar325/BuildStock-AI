// Runs only against an explicitly supplied disposable MySQL test database.
import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import {db,User,Project,Material,Membership,StockTransaction,AuditLog} from '../src/models/index.js';
import {recordStock,balance} from '../src/services/stock.js';
import {config} from '../src/config/env.js';
import app from '../src/app.js';

test('MySQL concurrency, idempotency, permissions, audit, and reports',{skip:process.env.RUN_DB_TESTS!=='true'},async()=>{
 assert.match(process.env.DB_NAME||'',/_test$/,'Use a dedicated database name ending in _test');
 assert.ok(config.secret.length>=32,'Set JWT_SECRET');
 await db.sync();
 const suffix=randomUUID();let project,material,admin,viewer,server;
 try{
  admin=await User.create({name:'Test Admin',email:`admin-${suffix}@example.com`,passwordHash:await bcrypt.hash('test-password-only',4),role:'admin'});
  viewer=await User.create({name:'Test Viewer',email:`viewer-${suffix}@example.com`,passwordHash:'unused',role:'viewer'});
  project=await Project.create({name:'Integration site',location:'Test only'});
  material=await Material.create({name:'Test Cement',sku:suffix,category:'Cement',unit:'bags',unitPrice:'10.00',minimumStock:'1.000'});
  const input={projectId:project.id,materialId:material.id,quantity:'10',reason:'Integration test',idempotencyKey:randomUUID()};
  const first=await recordStock(admin,input,'IN');const retry=await recordStock(admin,input,'IN');assert.equal(first.id,retry.id);
  await assert.rejects(recordStock(admin,{...input,quantity:'11'},'IN'),e=>e.status===409);
  const attempts=await Promise.allSettled([1,2].map(()=>recordStock(admin,{...input,quantity:'7',idempotencyKey:randomUUID()},'OUT')));
  assert.equal(attempts.filter(r=>r.status==='fulfilled').length,1);
  assert.equal(attempts.filter(r=>r.status==='rejected'&&r.reason.status===409).length,1);
  assert.equal(balance(await StockTransaction.findAll({where:{projectId:project.id}})).toString(),'3');
  assert.equal(await AuditLog.count({where:{projectId:project.id}}),2);
  server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const base=`http://127.0.0.1:${server.address().port}/api`;
  const token=user=>jwt.sign({},config.secret,{subject:String(user.id),algorithm:'HS256',issuer:'buildstock',audience:'buildstock-web',expiresIn:'1h'});
  const headers=user=>({Authorization:'Bearer '+token(user),'Content-Type':'application/json'});
  assert.equal((await fetch(`${base}/inventory?projectId=${project.id}`,{headers:headers(viewer)})).status,403);
  assert.equal((await fetch(base+'/stock/out',{method:'POST',headers:headers(viewer),body:JSON.stringify({...input,idempotencyKey:randomUUID()})})).status,403);
  await Membership.create({projectId:project.id,userId:viewer.id});
  const inv=await fetch(`${base}/inventory?projectId=${project.id}`,{headers:headers(viewer)});assert.equal(inv.status,200);assert.equal((await inv.json()).find(i=>i.materialId===material.id).quantity,'3.000');
  const csv=await fetch(`${base}/reports?projectId=${project.id}&format=csv`,{headers:headers(viewer)});assert.equal(csv.status,200);assert.match(await csv.text(),/Test Cement/);
  assert.equal((await fetch(`${base}/materials/${material.id}`,{method:'DELETE',headers:headers(admin)})).status,409);
  await project.update({status:'completed'});await assert.rejects(recordStock(admin,{...input,idempotencyKey:randomUUID()},'IN'),e=>e.status===409);
 }finally{
  if(server)await new Promise(r=>server.close(r));
  if(project){await AuditLog.destroy({where:{projectId:project.id}});await StockTransaction.destroy({where:{projectId:project.id}});await Membership.destroy({where:{projectId:project.id}});await project.destroy();}
  if(material)await material.destroy();if(viewer)await viewer.destroy();if(admin)await admin.destroy();await db.close();
 }
});
