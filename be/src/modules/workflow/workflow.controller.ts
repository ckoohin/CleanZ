import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import { WorkflowService } from './workflow.service';
import { CreateWorkflowDto } from './dto/create-workflow.dto';
import { UpdateWorkflowDto } from './dto/update-workflow.dto';
import {
  CreateWorkflowStepDto,
  UpdateWorkflowStepDto,
} from './dto/create-workflow-step.dto';
import { Auth } from '../auth/decorators/auth.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { successResponse } from '../../common/helpers/response.helper';

@ApiTags('Admin — Workflows')
@ApiBearerAuth()
@Auth(UserRole.ADMIN)
@Controller('admin/workflows')
export class WorkflowController {
  constructor(private readonly workflowService: WorkflowService) {}

  // ─── Workflow ──────────────────────────────────────────────────────────────

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách workflow (có filter)' })
  @ApiQuery({ name: 'subServiceId', required: false })
  @ApiQuery({ name: 'packageId', required: false })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  async findAll(
    @Query('subServiceId') subServiceId?: string,
    @Query('packageId') packageId?: string,
    @Query('isActive') isActive?: string,
  ) {
    const data = await this.workflowService.findAll({
      subServiceId,
      packageId,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
    });
    return successResponse(data);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết workflow kèm steps' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.workflowService.findOne(id);
    return successResponse(data);
  }

  @Post()
  @ApiOperation({ summary: 'Tạo workflow mới (kèm steps nếu muốn)' })
  async create(@Body() dto: CreateWorkflowDto) {
    const data = await this.workflowService.create(dto);
    return successResponse(data, 'Tạo workflow thành công');
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật thông tin workflow' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateWorkflowDto,
  ) {
    const data = await this.workflowService.update(id, dto);
    return successResponse(data, 'Cập nhật workflow thành công');
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Xóa workflow (cascade xóa steps)' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.workflowService.remove(id);
  }

  // ─── Steps ────────────────────────────────────────────────────────────────

  @Post(':id/steps')
  @ApiOperation({ summary: 'Thêm bước mới vào workflow' })
  async addStep(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateWorkflowStepDto,
  ) {
    const data = await this.workflowService.addStep(id, dto);
    return successResponse(data, 'Thêm bước thành công');
  }

  @Patch(':id/steps/:stepId')
  @ApiOperation({ summary: 'Cập nhật bước trong workflow' })
  async updateStep(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('stepId', ParseUUIDPipe) stepId: string,
    @Body() dto: UpdateWorkflowStepDto,
  ) {
    const data = await this.workflowService.updateStep(id, stepId, dto);
    return successResponse(data, 'Cập nhật bước thành công');
  }

  @Delete(':id/steps/:stepId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Xóa bước trong workflow' })
  async removeStep(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('stepId', ParseUUIDPipe) stepId: string,
  ) {
    return this.workflowService.removeStep(id, stepId);
  }

  @Patch(':id/steps/reorder')
  @ApiOperation({
    summary: 'Sắp xếp lại thứ tự các bước (gửi mảng step IDs theo thứ tự mới)',
  })
  async reorderSteps(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { orderedIds: string[] },
  ) {
    const data = await this.workflowService.reorderSteps(id, body.orderedIds);
    return successResponse(data, 'Cập nhật thứ tự thành công');
  }
}
