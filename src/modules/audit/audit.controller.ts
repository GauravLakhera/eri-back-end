import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles, UserRole } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';

@ApiTags('Audit')
@Controller('audit')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('eri-calls')
  @Roles(UserRole.SUPERADMIN, UserRole.CLIENT_ADMIN)
  @ApiOperation({ summary: 'Get ERI API audit logs' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiQuery({ name: 'transactionType', required: false, type: String })
  @ApiQuery({ name: 'isError', required: false, type: Boolean })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  async getEriCalls(
    @CurrentUser() user: JwtPayload, // FIXED: Moved to first position
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 50,
    @Query('transactionType') transactionType?: string,
    @Query('isError') isError?: boolean,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const filters = {
      transactionType,
      isError,
      startDate,
      endDate,
    };

    return this.auditService.findAll(user.clientId, filters, page, pageSize);
  }
}