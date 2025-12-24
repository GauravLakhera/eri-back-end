import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { TaxpayersService } from './taxpayers.service';
import { CreateTaxpayerDto } from './dto/create-taxpayer.dto';
import { LinkageVerifyDto } from './dto/linkage.dto';
import { JwtAuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';

@ApiTags('Taxpayers')
@Controller('taxpayers')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TaxpayersController {
  constructor(private readonly taxpayersService: TaxpayersService) {}

  @Post()
  @ApiOperation({ summary: 'Create new taxpayer' })
  async create(@Body() createTaxpayerDto: CreateTaxpayerDto, @CurrentUser() user: JwtPayload) {
    return this.taxpayersService.create(user.clientId, user.userId, createTaxpayerDto);
  }

  @Get()
  @ApiOperation({ summary: 'List taxpayers' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  async findAll(
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 20,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.taxpayersService.findAll(user.clientId, page, pageSize);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get taxpayer by ID' })
  async findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.taxpayersService.findById(id, user.clientId);
  }

  @Post(':id/linkage/start')
  @ApiOperation({ summary: 'Start taxpayer linkage (request OTP)' })
  async startLinkage(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.taxpayersService.startLinkage(id, user.clientId, user.userId);
  }

  @Post(':id/linkage/verify')
  @ApiOperation({ summary: 'Verify taxpayer linkage OTP' })
  async verifyLinkage(
    @Param('id') id: string,
    @Body() linkageVerifyDto: LinkageVerifyDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.taxpayersService.verifyLinkage(id, user.clientId, linkageVerifyDto.otp, user.userId);
  }
}