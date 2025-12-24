import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ReturnsService } from './returns.service';
import { CreateReturnDto } from './dto/create-return.dto';
import { DraftReturnDto } from './dto/draft-return.dto';
import { VerificationModeDto, GenerateEvcDto, VerifyEvcDto } from './dto/verification.dto';
import { JwtAuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';

@ApiTags('Returns')
@Controller('returns')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ReturnsController {
  constructor(private readonly returnsService: ReturnsService) {}

  @Post()
  @ApiOperation({ summary: 'Create new return' })
  async create(@Body() createReturnDto: CreateReturnDto, @CurrentUser() user: JwtPayload) {
    return this.returnsService.create(user.clientId, user.userId, createReturnDto);
  }

  @Get()
  @ApiOperation({ summary: 'List returns' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  async findAll(
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 20,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.returnsService.findAll(user.clientId, page, pageSize);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get return by ID' })
  async findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.returnsService.findById(id, user.clientId);
  }

  @Put(':id/draft')
  @ApiOperation({ summary: 'Save return draft' })
  async saveDraft(@Param('id') id: string, @Body() draftReturnDto: DraftReturnDto, @CurrentUser() user: JwtPayload) {
    return this.returnsService.saveDraft(id, user.clientId, draftReturnDto);
  }

  @Post(':id/buildPayload')
  @ApiOperation({ summary: 'Build ITR payload from draft' })
  async buildPayload(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.returnsService.buildPayload(id, user.clientId);
  }

  @Post(':id/validate')
  @ApiOperation({ summary: 'Validate return with ITD' })
  async validate(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.returnsService.validate(id, user.clientId, user.userId);
  }

  @Post(':id/submit')
  @ApiOperation({ summary: 'Submit return to ITD' })
  async submit(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.returnsService.submit(id, user.clientId, user.userId);
  }

  @Post(':id/verification/mode')
  @ApiOperation({ summary: 'Set verification mode' })
  async setVerificationMode(
    @Param('id') id: string,
    @Body() verificationModeDto: VerificationModeDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.returnsService.setVerificationMode(id, user.clientId, verificationModeDto, user.userId);
  }

  @Post(':id/verification/evc/generate')
  @ApiOperation({ summary: 'Generate EVC' })
  async generateEvc(@Param('id') id: string, @Body() generateEvcDto: GenerateEvcDto, @CurrentUser() user: JwtPayload) {
    return this.returnsService.generateEvc(id, user.clientId, generateEvcDto, user.userId);
  }

  @Post(':id/verification/evc/verify')
  @ApiOperation({ summary: 'Verify EVC with OTP' })
  async verifyEvc(@Param('id') id: string, @Body() verifyEvcDto: VerifyEvcDto, @CurrentUser() user: JwtPayload) {
    return this.returnsService.verifyEvc(id, user.clientId, verifyEvcDto, user.userId);
  }

  @Post(':id/ack/download')
  @ApiOperation({ summary: 'Download acknowledgement PDF' })
  async downloadAcknowledgement(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.returnsService.downloadAcknowledgement(id, user.clientId, user.userId);
  }

  @Get(':id/ack/url')
  @ApiOperation({ summary: 'Get acknowledgement download URL' })
  async getAcknowledgementUrl(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.returnsService.getAcknowledgementUrl(id, user.clientId);
  }
}