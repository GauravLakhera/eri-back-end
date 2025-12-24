import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { PrefillService } from './prefill.service';
import { FetchPrefillDto } from './dto/fetch-prefill.dto';
import { JwtAuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';

@ApiTags('Prefill')
@Controller('taxpayers/:taxpayerId/prefill')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PrefillController {
  constructor(private readonly prefillService: PrefillService) {}

  @Post('start')
  @ApiOperation({ summary: 'Request prefill OTP' })
  async startPrefill(
    @Param('taxpayerId') taxpayerId: string,
    @Body() body: { assessmentYear: string },
    @CurrentUser() user: JwtPayload,
  ) {
    return this.prefillService.startPrefill(taxpayerId, user.clientId, body.assessmentYear, user.userId);
  }

  @Post('fetch')
  @ApiOperation({ summary: 'Fetch prefill data with OTP' })
  async fetchPrefill(
    @Param('taxpayerId') taxpayerId: string,
    @Body() fetchPrefillDto: FetchPrefillDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.prefillService.fetchPrefill(taxpayerId, user.clientId, fetchPrefillDto, user.userId);
  }

  @Get('latest')
  @ApiOperation({ summary: 'Get latest prefill data' })
  @ApiQuery({ name: 'assessmentYear', required: true, type: String })
  async getLatest(
    @Param('taxpayerId') taxpayerId: string,
    @Query('assessmentYear') assessmentYear: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.prefillService.getLatest(taxpayerId, user.clientId, assessmentYear);
  }
}