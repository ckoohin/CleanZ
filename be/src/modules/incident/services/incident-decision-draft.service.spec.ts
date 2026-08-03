import { UnprocessableEntityException } from '@nestjs/common';
import { IncidentResponsibilityParty } from 'src/common/enums/incident-responsibility-party.enum';
import { IncidentDamageItemVerificationStatus } from 'src/common/enums/incident-damage-item-verification-status.enum';
import { IncidentStatus } from 'src/common/enums/incident-status.enum';
import { IncidentDamageItemEntity } from '../entity/incident-damage-item.entity';
import { IncidentEntity } from '../entity/incident.entity';
import { IncidentDecisionOutcome } from '../dto/save-incident-decision.dto';
import { IncidentDecisionService } from './incident-decision.service';

interface TestPolicy {
  policyVersion: string;
  policyCap: number;
  responseWindowHours: number;
  severityRuleSnapshot: Record<string, unknown>;
}

describe('IncidentDecisionService — chuẩn hoá & kiểm tra quyết định', () => {
  const service = new IncidentDecisionService(
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
  ) as unknown as {
    normalize: (
      dto: Record<string, unknown>,
      items: IncidentDamageItemEntity[],
    ) => Record<string, unknown>;
    validate: (
      items: IncidentDamageItemEntity[],
      decision: unknown,
      policy: TestPolicy,
    ) => void;
    validateFinal: (
      incident: IncidentEntity,
      items: IncidentDamageItemEntity[],
      policy: TestPolicy,
    ) => void;
    apply: (
      incident: IncidentEntity,
      items: IncidentDamageItemEntity[],
      decision: unknown,
      adminUserId: string,
    ) => void;
  };

  const policy: TestPolicy = {
    policyVersion: 'test',
    policyCap: 10_000_000,
    responseWindowHours: 48,
    severityRuleSnapshot: {},
  };

  const makeItems = (): IncidentDamageItemEntity[] => [
    {
      id: 'item-1',
      description: 'Vỡ mặt bàn kính',
      claimedAmount: 1_000_000,
      verifiedAmount: null,
      approvedAmount: null,
      verificationStatus: IncidentDamageItemVerificationStatus.PENDING,
    } as IncidentDamageItemEntity,
  ];

  const compensateDto = (over: Record<string, unknown> = {}) => ({
    expectedDecisionVersion: 0,
    outcome: IncidentDecisionOutcome.COMPENSATE,
    items: [{ damageItemId: 'item-1', approvedAmount: 1_000_000 }],
    responsibilityParty: IncidentResponsibilityParty.TASKER,
    responsibilityReason: 'Tasker làm vỡ trong lúc lau dọn.',
    taskerBorneAmount: 1_000_000,
    platformBorneAmount: 0,
    customerDecisionSummary: 'CleanZ duyệt bồi thường cho bạn.',
    ...over,
  });

  const run = (dto: Record<string, unknown>, items = makeItems()) => {
    const decision = service.normalize(dto, items);
    service.validate(items, decision, policy);
    return decision;
  };

  describe('gộp thẩm định vào duyệt tiền (một con số mỗi hạng mục)', () => {
    it('duyệt tiền không cần bước xác minh riêng trước đó', () => {
      const items = makeItems();
      expect(() => run(compensateDto(), items)).not.toThrow();
    });

    it('chặn duyệt vượt số khách yêu cầu ở hạng mục đó', () => {
      const items = makeItems();
      expect(() =>
        run(
          compensateDto({
            items: [{ damageItemId: 'item-1', approvedAmount: 2_000_000 }],
            taskerBorneAmount: 2_000_000,
          }),
          items,
        ),
      ).toThrow(UnprocessableEntityException);
    });

    it('apply() ghi verifiedAmount = approvedAmount để đối soát vẫn đọc được', () => {
      const items = makeItems();
      const decision = run(compensateDto(), items);
      const incident = {
        decisionVersion: 3,
        status: IncidentStatus.REVIEWING,
      } as IncidentEntity;

      service.apply(incident, items, decision, 'admin-1');

      expect(items[0].approvedAmount).toBe(1_000_000);
      expect(items[0].verifiedAmount).toBe(1_000_000);
      expect(items[0].verificationStatus).toBe(
        IncidentDamageItemVerificationStatus.VERIFIED,
      );
      expect(incident.decisionVersion).toBe(4);
      // Sang version mới thì bản đã gửi Tasker hết hiệu lực.
      expect(incident.sentTaskerBorneAmount).toBeNull();
      expect(incident.taskerResponseDeadline).toBeNull();
    });

    it('duyệt 0đ thì hạng mục tự chuyển sang REJECTED, duyệt >0 thì VERIFIED', () => {
      const items = [
        ...makeItems(),
        {
          id: 'item-2',
          description: 'Xước sàn gỗ',
          claimedAmount: 500_000,
          verificationStatus: IncidentDamageItemVerificationStatus.PENDING,
        } as IncidentDamageItemEntity,
      ];
      const decision = run(
        compensateDto({
          items: [
            { damageItemId: 'item-1', approvedAmount: 1_000_000 },
            { damageItemId: 'item-2', approvedAmount: 0 },
          ],
        }),
        items,
      ) as unknown as { itemStatuses: Map<string, string> };

      expect(decision.itemStatuses.get('item-1')).toBe(
        IncidentDamageItemVerificationStatus.VERIFIED,
      );
      expect(decision.itemStatuses.get('item-2')).toBe(
        IncidentDamageItemVerificationStatus.REJECTED,
      );
    });

    it('chặn hạng mục trùng trong cùng request', () => {
      expect(() =>
        run(
          compensateDto({
            items: [
              { damageItemId: 'item-1', approvedAmount: 600_000 },
              { damageItemId: 'item-1', approvedAmount: 400_000 },
            ],
          }),
        ),
      ).toThrow(UnprocessableEntityException);
    });
  });

  describe('phân bổ phải nhất quán với bên chịu trách nhiệm', () => {
    it('PLATFORM chịu trách nhiệm thì Tasker không chịu tiền', () => {
      expect(() =>
        run(
          compensateDto({
            responsibilityParty: IncidentResponsibilityParty.PLATFORM,
            taskerBorneAmount: 100_000,
            platformBorneAmount: 900_000,
          }),
        ),
      ).toThrow(UnprocessableEntityException);
    });

    it('UNDETERMINED phải để nền tảng gánh toàn bộ + có lý do phân bổ', () => {
      expect(() =>
        run(
          compensateDto({
            responsibilityParty: IncidentResponsibilityParty.UNDETERMINED,
            taskerBorneAmount: 0,
            platformBorneAmount: 1_000_000,
          }),
        ),
      ).toThrow(UnprocessableEntityException);

      expect(() =>
        run(
          compensateDto({
            responsibilityParty: IncidentResponsibilityParty.UNDETERMINED,
            taskerBorneAmount: 0,
            platformBorneAmount: 1_000_000,
            allocationReason: 'Chưa đủ căn cứ quy trách nhiệm cho Tasker.',
          }),
        ),
      ).not.toThrow();
    });

    it('tổng phân bổ phải bằng tổng duyệt', () => {
      expect(() =>
        run(
          compensateDto({
            taskerBorneAmount: 400_000,
            platformBorneAmount: 500_000,
          }),
        ),
      ).toThrow(UnprocessableEntityException);
    });

    it('vượt trần chính sách bị chặn', () => {
      const items = [
        {
          id: 'item-1',
          description: 'Hỏng tủ lạnh',
          claimedAmount: 20_000_000,
          verificationStatus: IncidentDamageItemVerificationStatus.PENDING,
        } as IncidentDamageItemEntity,
      ];
      expect(() =>
        run(
          compensateDto({
            items: [{ damageItemId: 'item-1', approvedAmount: 11_000_000 }],
            taskerBorneAmount: 11_000_000,
          }),
          items,
        ),
      ).toThrow(UnprocessableEntityException);
    });
  });

  describe('quyết định không bồi thường', () => {
    it('REJECT / NO_COMPENSATION không được kèm số tiền', () => {
      for (const outcome of [
        IncidentDecisionOutcome.REJECT,
        IncidentDecisionOutcome.NO_COMPENSATION,
      ]) {
        expect(() =>
          run({
            expectedDecisionVersion: 0,
            outcome,
            taskerBorneAmount: 100_000,
            customerDecisionSummary: 'Không đủ căn cứ bồi thường.',
          }),
        ).toThrow(UnprocessableEntityException);
      }
    });

    it('REJECT hợp lệ khi không có tiền, không cần bên chịu trách nhiệm', () => {
      expect(() =>
        run({
          expectedDecisionVersion: 0,
          outcome: IncidentDecisionOutcome.REJECT,
          customerDecisionSummary: 'Bằng chứng không khớp với hiện trường.',
        }),
      ).not.toThrow();
    });

    it('tóm tắt gửi khách phải đủ dài', () => {
      expect(() =>
        run({
          expectedDecisionVersion: 0,
          outcome: IncidentDecisionOutcome.REJECT,
          customerDecisionSummary: 'ngắn',
        }),
      ).toThrow(UnprocessableEntityException);
    });
  });

  describe('validateFinal — chốt chặn cuối trước khi chuyển tiền', () => {
    const finalItems = (approved: number, status?: string) =>
      [
        {
          id: 'item-1',
          description: 'Vỡ mặt bàn kính',
          claimedAmount: 1_000_000,
          approvedAmount: approved,
          verifiedAmount: approved,
          verificationStatus:
            status ?? IncidentDamageItemVerificationStatus.VERIFIED,
        },
      ] as IncidentDamageItemEntity[];

    it('tự kiểm tổng duyệt = tổng các hạng mục, không tin bước trước', () => {
      const incident = {
        approvedCompensationAmount: 1_500_000,
        taskerBorneAmount: 1_500_000,
        platformBorneAmount: 0,
        responsibilityParty: IncidentResponsibilityParty.TASKER,
      } as IncidentEntity;
      expect(() =>
        service.validateFinal(incident, finalItems(1_000_000), policy),
      ).toThrow(UnprocessableEntityException);
    });

    it('chặn chốt khi còn hạng mục chờ bổ sung bằng chứng', () => {
      const incident = {
        approvedCompensationAmount: 1_000_000,
        taskerBorneAmount: 1_000_000,
        platformBorneAmount: 0,
        responsibilityParty: IncidentResponsibilityParty.TASKER,
      } as IncidentEntity;
      expect(() =>
        service.validateFinal(
          incident,
          finalItems(
            1_000_000,
            IncidentDamageItemVerificationStatus.NEED_MORE_EVIDENCE,
          ),
          policy,
        ),
      ).toThrow(UnprocessableEntityException);
    });

    it('quyết định hợp lệ đi qua', () => {
      const incident = {
        approvedCompensationAmount: 1_000_000,
        taskerBorneAmount: 600_000,
        platformBorneAmount: 400_000,
        responsibilityParty: IncidentResponsibilityParty.SHARED,
      } as IncidentEntity;
      expect(() =>
        service.validateFinal(incident, finalItems(1_000_000), policy),
      ).not.toThrow();
    });
  });
});
