import test from 'node:test';
import assert from 'node:assert/strict';
import {balance,requireAvailable} from '../src/services/stock.js';
import {stockSchema,registerSchema} from '../src/utils/validation.js';
import {randomUUID} from 'node:crypto';
test('decimal balances remain exact',()=>assert.equal(balance([{type:'IN',quantity:'0.3'},{type:'OUT',quantity:'0.1'},{type:'OUT',quantity:'0.2'}]).toFixed(3),'0.000'));
test('overdraw is rejected but exact balance is allowed',()=>{assert.throws(()=>requireAvailable('2.000','2.001'),e=>e.status===409);assert.doesNotThrow(()=>requireAvailable('2','2'));});
test('negative and overprecision movements are rejected',()=>{for(const quantity of ['0','-3','1.0001','NaN','Infinity'])assert.equal(stockSchema.safeParse({projectId:1,materialId:1,quantity,reason:'Test',idempotencyKey:randomUUID()}).success,false);});
test('registration cannot self-assign a privileged role',()=>assert.equal(registerSchema.safeParse({name:'Test User',email:'test@example.com',password:'long-password',role:'admin'}).success,false));
