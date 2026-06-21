import { ConflictException } from '@nestjs/common';
import { IncidentStatus } from 'src/common/enums/incident-status.enum';
import { IncidentCompensationStatus } from 'src/common/enums/incident-compensation-status.enum';
import { IncidentStateService } from './incident-state.service';

describe('IncidentStateService (TC-U-STATE)', () => {
  const service = new IncidentStateService();

  describe('status transitions (chiều A)', () => {
    it('REPORTED → INVESTIGATING hợp lệ', () => {
      expect(() =>
        service.assertStatusTransition(
          IncidentStatus.REPORTED,
          IncidentStatus.INVESTIGATING,
        ),
      ).not.toThrow();
    });
    it('REPORTED → APPROVED bị chặn', () => {
      expect(() =>
        service.assertStatusTransition(
          IncidentStatus.REPORTED,
          IncidentStatus.APPROVED,
        ),
      ).toThrow(ConflictException);
    });
    it('CLOSED là terminal — không chuyển đi đâu', () => {
      for (const to of Object.values(IncidentStatus)) {
        expect(() =>
          service.assertStatusTransition(IncidentStatus.CLOSED, to),
        ).toThrow(ConflictException);
      }
    });
    it('INVESTIGATING → APPROVED/REJECTED/CLOSED hợp lệ', () => {
      for (const to of [
        IncidentStatus.APPROVED,
        IncidentStatus.REJECTED,
        IncidentStatus.CLOSED,
      ]) {
        expect(() =>
          service.assertStatusTransition(IncidentStatus.INVESTIGATING, to),
        ).not.toThrow();
      }
    });
  });

  describe('compensation transitions (chiều B)', () => {
    it('NONE→PENDING→PROCESSING→RECORDED hợp lệ', () => {
      expect(() =>
        service.assertCompensationTransition(
          IncidentCompensationStatus.NONE,
          IncidentCompensationStatus.PENDING,
        ),
      ).not.toThrow();
      expect(() =>
        service.assertCompensationTransition(
          IncidentCompensationStatus.PROCESSING,
          IncidentCompensationStatus.RECORDED,
        ),
      ).not.toThrow();
    });
    it('FAILED → PROCESSING (retry) hợp lệ', () => {
      expect(() =>
        service.assertCompensationTransition(
          IncidentCompensationStatus.FAILED,
          IncidentCompensationStatus.PROCESSING,
        ),
      ).not.toThrow();
    });
    it('RECORDED là terminal của chiều B', () => {
      expect(() =>
        service.assertCompensationTransition(
          IncidentCompensationStatus.RECORDED,
          IncidentCompensationStatus.PENDING,
        ),
      ).toThrow(ConflictException);
    });
  });
});
