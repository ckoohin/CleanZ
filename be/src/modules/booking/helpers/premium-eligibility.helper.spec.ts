import { TaskerEquipmentStatus } from 'src/common/enums/tasker-equipment-status.enum';
import {
  isTaskerPremiumEligible,
  premiumEligibilitySql,
} from './premium-eligibility.helper';

function tasker(
  overrides: Partial<Parameters<typeof isTaskerPremiumEligible>[0]> = {},
) {
  return {
    equipmentStatus: TaskerEquipmentStatus.APPROVED,
    ...overrides,
  };
}

describe('isTaskerPremiumEligible', () => {
  it('chấp nhận tasker có bộ dụng cụ đã được admin duyệt', () => {
    expect(isTaskerPremiumEligible(tasker())).toBe(true);
  });

  it('không dùng đánh giá, số đơn hoặc điểm cảnh cáo làm điều kiện', () => {
    const approvedTasker = {
      ...tasker(),
      ratingAvg: 1,
      totalCompletedJobs: 0,
      warningPoints: 999,
    };

    expect(isTaskerPremiumEligible(approvedTasker)).toBe(true);
  });

  describe('bộ dụng cụ', () => {
    it.each([
      TaskerEquipmentStatus.NONE,
      TaskerEquipmentStatus.PENDING,
      TaskerEquipmentStatus.REJECTED,
    ])('loại khi trạng thái dụng cụ là %s', (equipmentStatus) => {
      expect(isTaskerPremiumEligible(tasker({ equipmentStatus }))).toBe(false);
    });
  });
});

describe('premiumEligibilitySql', () => {
  const sql = premiumEligibilitySql('t');

  it('chỉ kiểm tra trạng thái bộ dụng cụ đã được duyệt', () => {
    expect(sql).not.toContain('rating_avg');
    expect(sql).not.toContain('total_completed_jobs');
    expect(sql).not.toContain('warning_points');
    expect(sql).toContain("t.equipment_status = 'APPROVED'");
  });

  it('áp đúng alias bảng được truyền vào', () => {
    expect(premiumEligibilitySql('tasker')).toContain(
      "tasker.equipment_status = 'APPROVED'",
    );
  });
});
