import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { PolicyService } from './policy.service';
import { CreatePolicyDto } from './dto/create-policy.dto';
import { UpdatePolicyDto } from './dto/update-policy.dto';
import { PolicyCategory, PolicyRole } from './entity/policy.entity';
import { Auth } from '../auth/decorators/auth.decorator';
import { UserRole } from 'src/common/enums/user-role.enum';

@Controller('policy')
export class PolicyController {
  constructor(private readonly policyService: PolicyService) {}

  // ─── Admin CRUD ────────────────────────────────────────────────────────────

  @Post()
  @Auth(UserRole.ADMIN)
  create(@Body() createPolicyDto: CreatePolicyDto) {
    return this.policyService.create(createPolicyDto);
  }

  /** POST /api/v1/policy/seed — Tạo dữ liệu mặc định (Admin only) */
  @Post('seed')
  @Auth(UserRole.ADMIN)
  bulkSeed() {
    return this.policyService.bulkSeed();
  }

  @Get()
  @Auth(UserRole.ADMIN)
  findAll(@Query('category') category?: PolicyCategory) {
    return this.policyService.findAll(category);
  }

  @Get('defaults')
  @Auth(UserRole.ADMIN)
  getDefaults() {
    return this.policyService.getDefaults();
  }

  @Get(':id')
  @Auth(UserRole.ADMIN)
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.policyService.findOne(id);
  }

  /** GET /api/v1/policy/:id/packages — Gói dịch vụ đang dùng chính sách này */
  @Get(':id/packages')
  @Auth(UserRole.ADMIN)
  getPackagesByPolicy(@Param('id', ParseUUIDPipe) id: string) {
    return this.policyService.getPackagesByPolicy(id);
  }

  @Patch(':id')
  @Auth(UserRole.ADMIN)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updatePolicyDto: UpdatePolicyDto,
  ) {
    return this.policyService.update(id, updatePolicyDto);
  }

  @Delete(':id')
  @Auth(UserRole.ADMIN)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.policyService.remove(id);
  }

  // ─── Package assignment ────────────────────────────────────────────────────

  @Get('packages/:packageId')
  @Auth(UserRole.ADMIN)
  getPoliciesByPackage(@Param('packageId', ParseUUIDPipe) packageId: string) {
    return this.policyService.getPoliciesByPackage(packageId);
  }

  @Post('packages/:packageId/assign')
  @Auth(UserRole.ADMIN)
  assignToPackage(
    @Param('packageId', ParseUUIDPipe) packageId: string,
    @Body() body: { policyIds: string[] },
  ) {
    return this.policyService.assignPoliciesToPackage(
      packageId,
      body.policyIds,
    );
  }

  @Delete('packages/:packageId/policies/:policyId')
  @Auth(UserRole.ADMIN)
  removePolicyFromPackage(
    @Param('packageId', ParseUUIDPipe) packageId: string,
    @Param('policyId', ParseUUIDPipe) policyId: string,
  ) {
    return this.policyService.removePolicyFromPackage(packageId, policyId);
  }

  @Post('packages/:packageId/apply-defaults')
  @Auth(UserRole.ADMIN)
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
