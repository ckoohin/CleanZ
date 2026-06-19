import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { AppModule } from './app.module';
import { IncidentService } from './modules/incident/services/incident.service';
import { IncidentAdminService } from './modules/incident/services/incident-admin.service';
import { IncidentTaskerService } from './modules/incident/services/incident-tasker.service';
import { IncidentDecisionService } from './modules/incident/services/incident-decision.service';
import { CompensationExecutorService } from './modules/incident/services/compensation-executor.service';
import { IncidentAutomationService } from './modules/incident/services/incident-automation.service';
import { IncidentConfigService } from './modules/incident/services/incident-config.service';
/* eslint-disable */
let PASS = 0, FAIL = 0;
const log = (s: string) => process.stdout.write(s + '\n');
function check(name: string, cond: boolean, extra = '') {
  if (cond) { PASS++; log('  PASS ' + name + (extra ? ' | ' + extra : '')); }
  else { FAIL++; log('  FAIL ' + name + (extra ? ' | ' + extra : '')); }
}
async function expectThrow(name: string, fn: () => Promise<any>, status?: number) {
  try { await fn(); check(name, false, 'no-throw'); }
  catch (e: any) { check(name, status ? e.getStatus?.() === status : true, e.constructor.name + (e.getStatus ? ' ' + e.getStatus() : '')); }
}
(async () => {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  const ds = app.get(DataSource);
  const svc = app.get(IncidentService);
  const admin = app.get(IncidentAdminService);
  const tasker = app.get(IncidentTaskerService);
  const dec = app.get(IncidentDecisionService);
  const exec = app.get(CompensationExecutorService);
  const auto = app.get(IncidentAutomationService);
  const cfg = app.get(IncidentConfigService);
  const q = (s: string, p?: any[]) => ds.query(s, p);
  const u: any[] = await q(`select id from users order by created_at limit 4`);
  const CU = u[0].id, TU = u[1].id, A1 = u[2].id, A2 = u[3].id;
  async function setup(code: string) {
    const custId = (await q(`insert into customers (user_id) values ($1) returning id`, [CU]))[0].id;
    const taskId = (await q(`insert into taskers (user_id,status,current_deposit_balance) values ($1,'ACTIVE',400000) returning id`, [TU]))[0].id;
    const bookId = (await q(`insert into bookings (booking_code,customer_id,tasker_id,service_id,address,duration_hours,base_price,total_price,status,completed_at) values ($1,$2,$3,gen_random_uuid(),'a',2,1,1,'COMPLETED',now()-interval '1 hour') returning id`, [code, custId, taskId]))[0].id;
    return { custId, taskId, bookId };
  }
  async function teardown(s: any) {
    await q(`delete from customer_incident_strikes where customer_id=$1`, [s.custId]).catch(() => {});
    await q(`delete from incident_status_logs where incident_id in (select id from incidents where customer_id=$1)`, [s.custId]).catch(() => {});
    await q(`delete from incident_statements where incident_id in (select id from incidents where customer_id=$1)`, [s.custId]).catch(() => {});
    await q(`delete from incident_damage_items where incident_id in (select id from incidents where customer_id=$1)`, [s.custId]).catch(() => {});
    await q(`delete from incidents where customer_id=$1`, [s.custId]).catch(() => {});
    await q(`delete from incident_evidences where uploaded_by_user_id in ($1,$2)`, [CU, TU]).catch(() => {});
    await q(`delete from bookings where customer_id=$1`, [s.custId]).catch(() => {});
    await q(`delete from taskers where id=$1`, [s.taskId]).catch(() => {});
    await q(`update customers set reporting_locked_until=null where id=$1`, [s.custId]).catch(() => {});
    await q(`delete from customers where id=$1`, [s.custId]).catch(() => {});
  }
  const ev = (user: string) => q(`insert into incident_evidences (file_url,file_type,uploaded_by_user_id) values ('http://i/x.jpg','IMAGE',$1) returning id`, [user]).then((r: any) => r[0].id);
  const nb = (s: any, code: string) => q(`insert into bookings (booking_code,customer_id,tasker_id,service_id,address,duration_hours,base_price,total_price,status,completed_at) values ($1,$2,$3,gen_random_uuid(),'a',2,1,1,'COMPLETED',now()-interval '1 hour') returning id`, [code, s.custId, s.taskId]).then((r: any) => r[0].id);
  const mk = (b: string, amt: number, e: string) => ({ bookingId: b, title: 't', description: 'd', damageItems: [{ description: 'x', claimedAmount: amt, evidenceIds: [e] }] }) as any;

  log('[A] Happy path day du (claim < 2tr)');
  let A: any;
  try {
    A = await setup('FF-A');
    const inc: any = await svc.create(CU, mk(A.bookId, 800000, await ev(CU)));
    check('create REPORTED + MINOR', inc.status === 'REPORTED' && inc.severity === 'MINOR', inc.incidentCode);
    check('listMine', (await svc.listMine(CU, {} as any)).meta.total >= 1);
    const det: any = await svc.findOneForCustomer(CU, inc.id);
    check('customer view an tai chinh', !('taskerBorneAmount' in det) && det.damageItems[0].evidences.length === 1);
    const acc: any = await admin.accept(A1, inc.id, {} as any);
    check('accept INVESTIGATING+dueAt', acc.status === 'INVESTIGATING' && !!acc.statementDueAt && !!acc.receivedDueAt);
    const tv: any = await tasker.findOne(TU, inc.id);
    check('tasker view canSubmit+an KH', tv.canSubmitStatement === true && !('taskerBorneAmount' in tv));
    check('tasker statement', !!(await tasker.submitStatement(TU, inc.id, { body: 'gt' } as any)).id);
    const item = tv.damageItems[0].id;
    await admin.verifyItems(inc.id, { items: [{ itemId: item, verifiedAmount: 600000 }] } as any);
    const dr: any = await dec.decide(A1, inc.id, { decision: 'APPROVE', items: [{ itemId: item, approvedAmount: 500000 }], taskerBorneAmount: 300000, platformBorneAmount: 200000, allocationReason: 'c' } as any);
    check('decide APPROVE/PENDING/MIXED/no-cooling', dr.status === 'APPROVED' && dr.compensationStatus === 'PENDING' && dr.compensationSource === 'MIXED' && dr.coolingUntil == null);
    const cm: any = await exec.execute(A1, inc.id);
    check('compensate RECORDED/COMPENSATED', cm.compensationStatus === 'RECORDED' && cm.status === 'COMPENSATED' && !!cm.resolvedAt);
    check('compensate idempotent', (await exec.execute(A1, inc.id)).compensationStatus === 'RECORDED');
    await q(`update incidents set updated_at=now()-interval '3 days' where id=$1`, [inc.id]);
    await auto.runHousekeeping();
    const fin = await q(`select status,closure_reason from incidents where id=$1`, [inc.id]);
    check('auto-close CLOSED/COMPENSATED', fin[0].status === 'CLOSED' && fin[0].closure_reason === 'COMPENSATED');
    const logs = await q(`select count(*)::int n from incident_status_logs where incident_id=$1`, [inc.id]);
    check('status-log chain >=6', logs[0].n >= 6, 'logs=' + logs[0].n);
  } catch (e: any) { check('A no-exception', false, e.message); } finally { if (A) await teardown(A); }

  log('[B] Claim >= 2tr: maker-checker + cooling');
  let B: any;
  try {
    B = await setup('FF-B');
    const inc: any = await svc.create(CU, mk(B.bookId, 3000000, await ev(CU)));
    check('severity MAJOR', inc.severity === 'MAJOR');
    await admin.accept(A1, inc.id, {} as any);
    const item = (await admin.findOne(inc.id)).damageItems[0].id;
    await admin.verifyItems(inc.id, { items: [{ itemId: item, verifiedAmount: 3000000 }] } as any);
    const dr: any = await dec.decide(A1, inc.id, { decision: 'APPROVE', items: [{ itemId: item, approvedAmount: 2000000 }], taskerBorneAmount: 400000, platformBorneAmount: 1600000, allocationReason: 'c' } as any);
    check('cooling set + MIXED', !!dr.coolingUntil && dr.compensationSource === 'MIXED');
    await expectThrow('compensate chan cooling', () => exec.execute(A1, inc.id), 409);
    await q(`update incidents set cooling_until=now()-interval '1 minute' where id=$1`, [inc.id]);
    await expectThrow('compensate chan thieu checker', () => exec.execute(A1, inc.id), 409);
    await expectThrow('checker==investigator', () => dec.approveCompensation(A1, inc.id), 409);
    await dec.approveCompensation(A2, inc.id);
    check('compensate sau checker RECORDED', (await exec.execute(A1, inc.id)).compensationStatus === 'RECORDED');
  } catch (e: any) { check('B no-exception', false, e.message); } finally { if (B) await teardown(B); }

  log('[C] Validation & guard errors');
  let C: any;
  try {
    C = await setup('FF-C');
    await q(`update bookings set completed_at=now()-interval '5 days' where id=$1`, [C.bookId]);
    const eW = await ev(CU);
    await expectThrow('window qua han 422', () => svc.create(CU, mk(C.bookId, 100000, eW)), 422);
    await q(`update bookings set completed_at=now()-interval '1 hour' where id=$1`, [C.bookId]);
    const eM = await ev(CU);
    await expectThrow('claim>20tr 422', () => svc.create(CU, mk(C.bookId, 25000000, eM)), 422);
    const inc: any = await svc.create(CU, mk(C.bookId, 800000, await ev(CU)));
    const eD = await ev(CU);
    await expectThrow('duplicate 409', () => svc.create(CU, mk(C.bookId, 1, eD)), 409);
    await expectThrow('IDOR tasker 404', () => tasker.findOne(A2, inc.id), 404);
    await admin.accept(A1, inc.id, {} as any);
    const item = (await admin.findOne(inc.id)).damageItems[0].id;
    await admin.verifyItems(inc.id, { items: [{ itemId: item, verifiedAmount: 600000 }] } as any);
    await expectThrow('approved>verified 422', () => dec.decide(A1, inc.id, { decision: 'APPROVE', items: [{ itemId: item, approvedAmount: 700000 }], taskerBorneAmount: 700000, platformBorneAmount: 0 } as any), 422);
    await expectThrow('alloc mismatch 422', () => dec.decide(A1, inc.id, { decision: 'APPROVE', items: [{ itemId: item, approvedAmount: 500000 }], taskerBorneAmount: 300000, platformBorneAmount: 100000 } as any), 422);
    await expectThrow('taskerBorne>coc 422', () => dec.decide(A1, inc.id, { decision: 'APPROVE', items: [{ itemId: item, approvedAmount: 500000 }], taskerBorneAmount: 500000, platformBorneAmount: 0 } as any), 422);
    await q(`update incidents set statement_due_at=now()-interval '1 hour' where id=$1`, [inc.id]);
    await expectThrow('statement qua han 409', () => tasker.submitStatement(TU, inc.id, { body: 't' } as any), 409);
  } catch (e: any) { check('C no-exception', false, e.message); } finally { if (C) await teardown(C); }

  log('[D] Withdraw');
  let D: any;
  try {
    D = await setup('FF-D');
    const inc: any = await svc.create(CU, mk(D.bookId, 500000, await ev(CU)));
    const w: any = await svc.withdraw(CU, inc.id, { reason: 'x' } as any);
    check('withdraw CLOSED/WITHDRAWN', w.status === 'CLOSED' && w.closureReason === 'WITHDRAWN');
  } catch (e: any) { check('D no-exception', false, e.message); } finally { if (D) await teardown(D); }

  log('[E] Reject fraud -> lock -> unlock');
  let E: any;
  try {
    await cfg.updateConfig({ INCIDENT_FALSE_REPORT_STRIKES: JSON.stringify({ warn: [], lockFrom: 1 }) });
    E = await setup('FF-E');
    const b2 = await nb(E, 'FF-E2');
    const inc: any = await svc.create(CU, mk(E.bookId, 500000, await ev(CU)));
    await admin.accept(A1, inc.id, {} as any);
    const r: any = await dec.decide(A1, inc.id, { decision: 'REJECT', reason: 'g', rejectAsFraud: true } as any);
    check('reject REJECTED', r.status === 'REJECTED' && r.closureReason === 'REJECTED');
    check('fraud lock set', !!(await q(`select reporting_locked_until from customers where id=$1`, [E.custId]))[0].reporting_locked_until);
    const eL = await ev(CU);
    await expectThrow('locked create chan 403', () => svc.create(CU, mk(b2, 100000, eL)), 403);
    await admin.unlockReporter(inc.id);
    check('unlock create lai OK', (await svc.create(CU, mk(b2, 100000, eL))).status === 'REPORTED');
  } catch (e: any) { check('E no-exception', false, e.message); } finally { if (E) await teardown(E); await cfg.updateConfig({ INCIDENT_FALSE_REPORT_STRIKES: JSON.stringify({ warn: [1, 2], lockFrom: 3 }) }); }

  log('[F] EXPIRED housekeeping + auto-close guard');
  let F: any;
  try {
    F = await setup('FF-F');
    const inc: any = await svc.create(CU, mk(F.bookId, 100000, await ev(CU)));
    await q(`update incidents set reported_at=now()-interval '40 days' where id=$1`, [inc.id]);
    await auto.runHousekeeping();
    let s = await q(`select status,closure_reason from incidents where id=$1`, [inc.id]);
    check('EXPIRED CLOSED/EXPIRED', s[0].status === 'CLOSED' && s[0].closure_reason === 'EXPIRED');
    const b2 = await nb(F, 'FF-F2');
    const inc2: any = await svc.create(CU, mk(b2, 100000, await ev(CU)));
    await q(`update incidents set status='COMPENSATED', compensation_status='FAILED', updated_at=now()-interval '3 days' where id=$1`, [inc2.id]);
    await auto.runHousekeeping();
    s = await q(`select status from incidents where id=$1`, [inc2.id]);
    check('auto-close GUARD FAILED khong dong', s[0].status === 'COMPENSATED');
  } catch (e: any) { check('F no-exception', false, e.message); } finally { if (F) await teardown(F); }

  log('==== SUMMARY: ' + PASS + ' PASS / ' + FAIL + ' FAIL ====');
  await app.close();
  process.exit(FAIL > 0 ? 1 : 0);
})().catch((e) => { log('FATAL ' + e.message); process.exit(1); });
