import { DataTypes as D } from 'sequelize';
import { db } from '../config/database.js';
const id = () => ({ type: D.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true });
const text = (n=160) => ({ type: D.STRING(n), allowNull: false });
const money = () => ({ type: D.DECIMAL(14,2), allowNull: false, defaultValue: 0 });
export const User = db.define('User', {
 id:id(), name:text(), email:{...text(254), unique:true}, passwordHash:text(255),
 role:{type:D.ENUM('admin','manager','storekeeper','viewer'),allowNull:false,defaultValue:'viewer'},
 active:{type:D.BOOLEAN,defaultValue:true,allowNull:false}
}, {tableName:'users', defaultScope:{attributes:{exclude:['passwordHash']}}});
export const Project = db.define('Project', {
 id:id(), name:text(), location:text(255), status:{type:D.ENUM('active','completed'),defaultValue:'active',allowNull:false}
}, {tableName:'projects'});
export const Membership = db.define('Membership', {
 id:id(), projectId:{type:D.INTEGER.UNSIGNED,allowNull:false},userId:{type:D.INTEGER.UNSIGNED,allowNull:false}
}, {tableName:'project_members',indexes:[{unique:true,fields:['project_id','user_id']}]});
export const Material = db.define('Material', {
 id:id(), name:text(), sku:{...text(60),unique:true}, category:text(80), unit:text(30),
 unitPrice:money(), minimumStock:{type:D.DECIMAL(14,3),allowNull:false,defaultValue:0},
 active:{type:D.BOOLEAN,defaultValue:true,allowNull:false}
}, {tableName:'materials'});
export const StockTransaction = db.define('StockTransaction', {
 id:id(), projectId:{type:D.INTEGER.UNSIGNED,allowNull:false}, materialId:{type:D.INTEGER.UNSIGNED,allowNull:false},
 userId:{type:D.INTEGER.UNSIGNED,allowNull:false}, type:{type:D.ENUM('IN','OUT'),allowNull:false},
 quantity:{type:D.DECIMAL(14,3),allowNull:false}, unitPrice:money(),
 date:{type:D.DATEONLY,allowNull:false},reason:text(500),
 idempotencyKey:{...text(100),unique:true}
}, {tableName:'stock_transactions',updatedAt:false,indexes:[{fields:['project_id','material_id','date']}]});
export const AuditLog = db.define('AuditLog', {
 id:id(), userId:{type:D.INTEGER.UNSIGNED,allowNull:true},projectId:{type:D.INTEGER.UNSIGNED,allowNull:true},
 materialId:{type:D.INTEGER.UNSIGNED,allowNull:true},action:text(80),details:{type:D.JSON,allowNull:false}
}, {tableName:'audit_logs',updatedAt:false});
User.belongsToMany(Project,{through:Membership,foreignKey:'userId'});
Project.belongsToMany(User,{through:Membership,foreignKey:'projectId'});
for (const [model,key] of [[User,'userId'],[Project,'projectId'],[Material,'materialId']]) {
 StockTransaction.belongsTo(model,{foreignKey:key,onDelete:'RESTRICT'});
 model.hasMany(StockTransaction,{foreignKey:key});
 AuditLog.belongsTo(model,{foreignKey:key,onDelete:'RESTRICT'});
}
export { db };
