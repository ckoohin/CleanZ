import { UnprocessableEntityException } from '@nestjs/common';
import { IncidentDecisionResponseType } from 'src/common/enums/incident-decision-response-type.enum';
import { IncidentDecisionResponseEntity } from '../entity/incident-decision-response.entity';
import { IncidentTaskerService } from './incident-tasker.service';

describe('IncidentTaskerService decision response helpers', () => {
  const service = new IncidentTaskerService(
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
  ) as unknown as {
    validateDecisionResponsePayload: (dto: Record<string, unknown>) => void;
    isSameDecisionResponsePayload: (
      response: IncidentDecisionResponseEntity,
      dto: Record<string, unknown>,
      activeEvidenceIds: string[],
    ) => boolean;
    buildTaskerResponseDedupeKey: (
      incidentId: string,
      decisionVersion: number,
      taskerUserId: string,
      responseRevision: number,
    ) => string;
  };

  it('requires content for DISAGREE response', () => {
    expect(() =>
      service.validateDecisionResponsePayload({
        decisionVersion: 1,
        responseType: IncidentDecisionResponseType.DISAGREE,
        content: 'short',
      }),
    ).toThrow(UnprocessableEntityException);
  });

  it('allows AGREE response without content', () => {
    expect(() =>
      service.validateDecisionResponsePayload({
        decisionVersion: 1,
        responseType: IncidentDecisionResponseType.AGREE,
      }),
    ).not.toThrow();
  });

  it('detects same response payload with sorted evidence ids', () => {
    const response = {
      responseType: IncidentDecisionResponseType.DISAGREE,
      content: 'This is a valid tasker response.',
    } as IncidentDecisionResponseEntity;

    expect(
      service.isSameDecisionResponsePayload(
        response,
        {
          responseType: IncidentDecisionResponseType.DISAGREE,
          content: '  This is a valid tasker response. ',
          evidenceIds: ['e2', 'e1'],
        },
        ['e1', 'e2'],
      ),
    ).toBe(true);
  });

  it('builds response outbox dedupe key with revision', () => {
    expect(
      service.buildTaskerResponseDedupeKey('incident-1', 3, 'tasker-user-1', 2),
    ).toBe('incident:incident-1:decision:3:tasker-response:tasker-user-1:2');
  });
});
