import { UnprocessableEntityException } from '@nestjs/common';
import { IncidentResponsibilityParty } from 'src/common/enums/incident-responsibility-party.enum';
import { IncidentDecisionResponseReviewResult } from 'src/common/enums/incident-decision-response-review-result.enum';
import { IncidentDamageItemEntity } from '../entity/incident-damage-item.entity';
import { IncidentEntity } from '../entity/incident.entity';
import { IncidentDecisionResponseEntity } from '../entity/incident-decision-response.entity';
import { IncidentDecisionDraftDecision } from '../dto/save-incident-decision-draft.dto';
import { IncidentDecisionService } from './incident-decision.service';
import { IncidentDecisionStatus } from 'src/common/enums/incident-decision-status.enum';
import { IncidentResponseWindowStatus } from 'src/common/enums/incident-response-window-status.enum';

describe('IncidentDecisionService save draft validation', () => {
  const service = new IncidentDecisionService(
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
  ) as unknown as {
    normalizeDecisionDraft: (
      dto: Record<string, unknown>,
      items: IncidentDamageItemEntity[],
      policy: { policyCap: number; dualApprovalThreshold: number },
    ) => unknown;
    validateDecisionDraft: (
      items: IncidentDamageItemEntity[],
      draft: unknown,
      policy: { policyCap: number; dualApprovalThreshold: number },
    ) => void;
    isAdverseIncidentDraft: (incident: IncidentEntity) => boolean;
    buildTaskerSafeDecisionDraftPayload: (
      incident: IncidentEntity,
    ) => Record<string, unknown>;
    buildTaskerDraftSubmittedDedupeKey: (
      incidentId: string,
      decisionVersion: number,
      taskerUserId: string,
    ) => string;
    normalizeAdminReviewNote: (note?: string | null) => string;
    isSameReview: (
      response: IncidentDecisionResponseEntity,
      result: IncidentDecisionResponseReviewResult,
      normalizedNote: string,
    ) => boolean;
    shouldReopenTaskerResponse: (
      previous: {
        responsibilityParty: IncidentResponsibilityParty | null;
        taskerBorneAmount: number;
        taskerDecisionReason: string | null;
      },
      revised: {
        responsibilityParty: IncidentResponsibilityParty | null;
        taskerBorneAmount: number;
        taskerDecisionReason: string | null;
      },
    ) => boolean;
    applyDecisionDraft: (
      incident: IncidentEntity,
      items: IncidentDamageItemEntity[],
      draft: {
        itemApprovals: Map<string, number>;
        totalApprovedAmount: number;
        taskerBorneAmount: number;
        platformBorneAmount: number;
        allocationReason: string | null;
        compensationSource: null;
        responsibilityParty: IncidentResponsibilityParty | null;
        responsibilityReason: string | null;
        internalDecisionNote: string | null;
        taskerDecisionReason: string | null;
        customerDecisionSummary: string;
      },
      adminUserId: string,
    ) => void;
    requiresSecondAdminApproval: (
      incident: IncidentEntity,
      policy: { policyCap: number; dualApprovalThreshold: number },
    ) => boolean;
    buildCustomerFinalDecisionPayload: (
      incident: IncidentEntity,
    ) => Record<string, unknown>;
    assertDifferentSecondApprovalAdmin: (
      incident: IncidentEntity,
      adminUserId: string,
    ) => void;
    normalizeSecondApprovalNote: (note?: string | null) => string;
  };

  const policy = { policyCap: 10_000_000, dualApprovalThreshold: 5_000_000 };

  const items = [
    {
      id: 'damage-item-1',
      verifiedAmount: 1_000_000,
      approvedAmount: null,
    } as IncidentDamageItemEntity,
  ];

  function normalize(dto: Record<string, unknown>): unknown {
    return service.normalizeDecisionDraft(dto, items, policy);
  }

  it('rejects PLATFORM responsibility with tasker borne amount', () => {
    const draft = normalize({
      expectedDecisionVersion: 0,
      decision: IncidentDecisionDraftDecision.APPROVE,
      items: [{ damageItemId: 'damage-item-1', approvedAmount: 1_000_000 }],
      responsibilityParty: IncidentResponsibilityParty.PLATFORM,
      responsibilityReason: 'CleanZ accepts responsibility.',
      taskerBorneAmount: 100_000,
      platformBorneAmount: 900_000,
      customerDecisionSummary: 'CleanZ approves this compensation.',
    });

    expect(() => service.validateDecisionDraft(items, draft, policy)).toThrow(
      UnprocessableEntityException,
    );
  });

  it('does not cap tasker borne amount by current deposit in phase 1', () => {
    const draft = normalize({
      expectedDecisionVersion: 0,
      decision: IncidentDecisionDraftDecision.APPROVE,
      items: [{ damageItemId: 'damage-item-1', approvedAmount: 1_000_000 }],
      responsibilityParty: IncidentResponsibilityParty.TASKER,
      responsibilityReason: 'Tasker caused the verified damage.',
      taskerBorneAmount: 1_000_000,
      platformBorneAmount: 0,
      customerDecisionSummary: 'CleanZ approves this compensation.',
    });

    expect(() =>
      service.validateDecisionDraft(items, draft, policy),
    ).not.toThrow();
  });

  it('rejects allocation total mismatch', () => {
    const draft = normalize({
      expectedDecisionVersion: 0,
      decision: IncidentDecisionDraftDecision.APPROVE,
      items: [{ damageItemId: 'damage-item-1', approvedAmount: 1_000_000 }],
      responsibilityParty: IncidentResponsibilityParty.SHARED,
      responsibilityReason: 'Both sides share responsibility.',
      taskerBorneAmount: 400_000,
      platformBorneAmount: 500_000,
      customerDecisionSummary: 'CleanZ approves this compensation.',
    });

    expect(() => service.validateDecisionDraft(items, draft, policy)).toThrow(
      UnprocessableEntityException,
    );
  });

  it('rejects REJECT payload with approved amount', () => {
    expect(() =>
      normalize({
        expectedDecisionVersion: 0,
        decision: IncidentDecisionDraftDecision.REJECT,
        items: [{ damageItemId: 'damage-item-1', approvedAmount: 1 }],
        customerDecisionSummary: 'CleanZ rejects this compensation.',
      }),
    ).toThrow(UnprocessableEntityException);
  });

  it('detects adverse tasker draft by responsibility or tasker amount', () => {
    expect(
      service.isAdverseIncidentDraft({
        responsibilityParty: IncidentResponsibilityParty.PLATFORM,
        taskerBorneAmount: 0,
      } as IncidentEntity),
    ).toBe(false);
    expect(
      service.isAdverseIncidentDraft({
        responsibilityParty: IncidentResponsibilityParty.TASKER,
        taskerBorneAmount: 0,
      } as IncidentEntity),
    ).toBe(true);
    expect(
      service.isAdverseIncidentDraft({
        responsibilityParty: IncidentResponsibilityParty.PLATFORM,
        taskerBorneAmount: 1,
      } as IncidentEntity),
    ).toBe(true);
  });

  it('builds tasker-safe payload without internal admin note', () => {
    const payload = service.buildTaskerSafeDecisionDraftPayload({
      id: 'incident-1',
      incidentCode: 'IC-1',
      decisionVersion: 3,
      responsibilityParty: IncidentResponsibilityParty.TASKER,
      taskerDecisionReason: 'Tasker-facing reason',
      internalDecisionNote: 'admin-only',
      approvedCompensationAmount: 1_000_000,
      taskerBorneAmount: 400_000,
      taskerResponseDeadline: new Date('2026-07-05T10:00:00Z'),
    } as IncidentEntity);

    expect(payload).toMatchObject({
      incidentId: 'incident-1',
      incidentCode: 'IC-1',
      decisionVersion: 3,
      responsibilityParty: IncidentResponsibilityParty.TASKER,
      taskerDecisionReason: 'Tasker-facing reason',
      approvedAmount: 1_000_000,
      taskerBorneAmount: 400_000,
    });
    expect(payload).not.toHaveProperty('internalDecisionNote');
  });

  it('builds submit outbox dedupe key with incident, version, and recipient', () => {
    expect(
      service.buildTaskerDraftSubmittedDedupeKey(
        'incident-1',
        3,
        'tasker-user-1',
      ),
    ).toBe(
      'incident:incident-1:decision:3:tasker-draft-submitted:tasker-user-1',
    );
  });

  it('requires meaningful admin review note', () => {
    expect(() => service.normalizeAdminReviewNote('short')).toThrow(
      UnprocessableEntityException,
    );
    expect(service.normalizeAdminReviewNote('  This review is valid. ')).toBe(
      'This review is valid.',
    );
  });

  it('detects same reviewed response payload for idempotency', () => {
    const response = {
      reviewResult: IncidentDecisionResponseReviewResult.KEEP_DECISION,
      adminReviewNote: 'Decision remains valid.',
    } as IncidentDecisionResponseEntity;

    expect(
      service.isSameReview(
        response,
        IncidentDecisionResponseReviewResult.KEEP_DECISION,
        'Decision remains valid.',
      ),
    ).toBe(true);
    expect(
      service.isSameReview(
        response,
        IncidentDecisionResponseReviewResult.REVISE_DECISION,
        'Decision remains valid.',
      ),
    ).toBe(false);
  });

  it('requires reopened tasker response when revision becomes more adverse', () => {
    expect(
      service.shouldReopenTaskerResponse(
        {
          responsibilityParty: IncidentResponsibilityParty.PLATFORM,
          taskerBorneAmount: 0,
          taskerDecisionReason: null,
        },
        {
          responsibilityParty: IncidentResponsibilityParty.TASKER,
          taskerBorneAmount: 0,
          taskerDecisionReason: 'Tasker now has responsibility.',
        },
      ),
    ).toBe(true);

    expect(
      service.shouldReopenTaskerResponse(
        {
          responsibilityParty: IncidentResponsibilityParty.TASKER,
          taskerBorneAmount: 500_000,
          taskerDecisionReason: 'Tasker caused damage.',
        },
        {
          responsibilityParty: IncidentResponsibilityParty.TASKER,
          taskerBorneAmount: 300_000,
          taskerDecisionReason: 'Tasker caused damage.',
        },
      ),
    ).toBe(false);
  });

  it('apply draft resets response, finalization, and approval fields for revise', () => {
    const incident = {
      decisionStatus: IncidentDecisionStatus.DRAFT,
      decisionVersion: 3,
      taskerResponseDeadline: new Date(),
      taskerResponseReviewedAt: new Date(),
      responseWindowStatus: IncidentResponseWindowStatus.REVIEWED,
      secondApprovalNote: 'old',
      secondApprovalRequestedAt: new Date(),
      secondApprovalDueAt: new Date(),
      secondApprovedByAdmin: { id: 'admin-2' },
      secondApprovedAt: new Date(),
      finalizedByAdmin: { id: 'admin-1' },
      finalizedAt: new Date(),
    } as IncidentEntity;
    const item = {
      id: 'damage-item-1',
      approvedAmount: 1,
    } as IncidentDamageItemEntity;

    service.applyDecisionDraft(
      incident,
      [item],
      {
        itemApprovals: new Map([['damage-item-1', 100]]),
        totalApprovedAmount: 100,
        taskerBorneAmount: 100,
        platformBorneAmount: 0,
        allocationReason: null,
        compensationSource: null,
        responsibilityParty: IncidentResponsibilityParty.TASKER,
        responsibilityReason: 'Tasker caused damage.',
        internalDecisionNote: null,
        taskerDecisionReason: 'Tasker-facing reason.',
        customerDecisionSummary: 'Customer-facing summary.',
      },
      'admin-1',
    );

    expect(incident.decisionVersion).toBe(4);
    expect(incident.responseWindowStatus).toBe(
      IncidentResponseWindowStatus.NONE,
    );
    expect(incident.taskerResponseDeadline).toBeNull();
    expect(incident.taskerResponseReviewedAt).toBeNull();
    expect(incident.secondApprovalRequestedAt).toBeNull();
    expect(incident.secondApprovedByAdmin).toBeNull();
    expect(incident.finalizedAt).toBeNull();
    expect(item.approvedAmount).toBe(100);
  });

  it('requires second admin for threshold and allocation exceptions', () => {
    expect(
      service.requiresSecondAdminApproval(
        {
          approvedCompensationAmount: 2_000_000,
          responsibilityParty: IncidentResponsibilityParty.PLATFORM,
          taskerBorneAmount: 0,
          platformBorneAmount: 2_000_000,
        } as IncidentEntity,
        { policyCap: 10_000_000, dualApprovalThreshold: 2_000_000 },
      ),
    ).toBe(true);

    expect(
      service.requiresSecondAdminApproval(
        {
          approvedCompensationAmount: 100_000,
          responsibilityParty: IncidentResponsibilityParty.TASKER,
          taskerBorneAmount: 0,
          platformBorneAmount: 100_000,
        } as IncidentEntity,
        { policyCap: 10_000_000, dualApprovalThreshold: 2_000_000 },
      ),
    ).toBe(true);
  });

  it('builds customer final payload without internal allocation split', () => {
    const payload = service.buildCustomerFinalDecisionPayload({
      id: 'incident-1',
      incidentCode: 'IC-1',
      decisionVersion: 4,
      status: 'APPROVED',
      approvedCompensationAmount: 1_000_000,
      taskerBorneAmount: 400_000,
      platformBorneAmount: 600_000,
      allocationReason: 'internal split',
      internalDecisionNote: 'admin only',
      customerDecisionSummary: 'Customer-facing final summary.',
    } as unknown as IncidentEntity);

    expect(payload).toMatchObject({
      incidentId: 'incident-1',
      incidentCode: 'IC-1',
      decisionVersion: 4,
      status: 'APPROVED',
      approvedAmount: 1_000_000,
      customerDecisionSummary: 'Customer-facing final summary.',
    });
    expect(payload).not.toHaveProperty('taskerBorneAmount');
    expect(payload).not.toHaveProperty('platformBorneAmount');
    expect(payload).not.toHaveProperty('allocationReason');
    expect(payload).not.toHaveProperty('internalDecisionNote');
  });

  it('requires different admin for second approval', () => {
    expect(() =>
      service.assertDifferentSecondApprovalAdmin(
        { finalizedByAdmin: { id: 'admin-1' } } as IncidentEntity,
        'admin-1',
      ),
    ).toThrow();

    expect(() =>
      service.assertDifferentSecondApprovalAdmin(
        { finalizedByAdmin: { id: 'admin-1' } } as IncidentEntity,
        'admin-2',
      ),
    ).not.toThrow();
  });

  it('requires note for second approval request changes', () => {
    expect(() => service.normalizeSecondApprovalNote('short')).toThrow();
    expect(
      service.normalizeSecondApprovalNote('  Please verify quote again. '),
    ).toBe('Please verify quote again.');
  });
});
