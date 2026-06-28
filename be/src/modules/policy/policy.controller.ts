import {
  Body, Controller, Delete, Get, Param, ParseUUIDPipe,
  Patch, Post, Query,
} from '@nestjs/common';
import { PolicyService } from './policy.service';
import { CreatePolicyDto } from './dto/create-policy.dto';
import { UpdatePolicyDto } from './dto/update-policy.dto';
import { PolicyCategory, PolicyRole } from './entity/policy.entity';

@Controller('policy')
export class PolicyController {
  constructor(private readonly policyService: PolicyService) {}

  // ─── Admin CRUD ────────────────────────────────────────────────────────────

  @Post()
  create(@Body() createPolicyDto: CreatePolicyDto) {
    return this.policyService.create(createPolicyDto);
  }

  /** POST /api/v1/policy/seed — Tạo dữ liệu mặc định (Admin only) */
  @Post('seed')
  bulkSeed() {
    return this.policyService.bulkSeed();
  }

  @Get()
  findAll(@Query('category') category?: PolicyCategory) {
    return this.policyService.findAll(category);
  }

  @Get('defaults')
  getDefaults() {
    return this.policyService.getDefaults();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.policyService.findOne(id);
  }

  /** GET /api/v1/policy/:id/packages — Gói dịch vụ đang dùng chính sách này */
  @Get(':id/packages')
  getPackagesByPolicy(@Param('id', ParseUUIDPipe) id: string) {
    return this.policyService.getPackagesByPolicy(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updatePolicyDto: UpdatePolicyDto,
  ) {
    return this.policyService.update(id, updatePolicyDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.policyService.remove(id);
  }

  // ─── Package assignment ────────────────────────────────────────────────────

  @Get('packages/:packageId')
  getPoliciesByPackage(@Param('packageId', ParseUUIDPipe) packageId: string) {
    return this.policyService.getPoliciesByPackage(packageId);
  }

  @Post('packages/:packageId/assign')
  assignToPackage(
    @Param('packageId', ParseUUIDPipe) packageId: string,
    @Body() body: { policyIds: string[] },
  ) {
    return this.policyService.assignPoliciesToPackage(packageId, body.policyIds);
  }

  @Delete('packages/:packageId/policies/:policyId')
  removePolicyFromPackage(
    @Param('packageId', ParseUUIDPipe) packageId: string,
    @Param('policyId', ParseUUIDPipe) policyId: string,
  ) {
    return this.policyService.removePolicyFromPackage(packageId, policyId);
  }

  @Post('packages/:packageId/apply-defaults')
  applyDefaults(@Param('packageId', ParseUUIDPipe) packageId: string) {
    return this.policyService.applyDefaultsToPackage(packageId);
  }

  // ─── Public ───────────────────────────────────────────────────────────────

  @Get('public/all')
  getPublicPolicies(@Query('role') role?: PolicyRole) {
    return this.policyService.getPublicPolicies(role);
  }

  @Get('public/by-slug/:slug')
  findPublicBySlug(@Param('slug') slug: string) {
    return this.policyService.findPublicBySlug(slug);
  }
}
