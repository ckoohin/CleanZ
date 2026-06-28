import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServiceWorkflowEntity } from './entity/service-workflow.entity';
import { WorkflowStepEntity } from './entity/workflow-step.entity';
import { WorkflowService } from './workflow.service';
import { WorkflowController } from './workflow.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([ServiceWorkflowEntity, WorkflowStepEntity]),
  ],
  controllers: [WorkflowController],
  providers: [WorkflowService],
  exports: [WorkflowService],
})
export class WorkflowModule {}
