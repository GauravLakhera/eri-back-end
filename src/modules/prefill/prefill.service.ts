import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PrefillData, PrefillDataDocument } from './schemas/prefill-data.schema';
import { FetchPrefillDto } from './dto/fetch-prefill.dto';
import { EriService } from '../eri/eri.service';
import { TaxpayersService } from '../taxpayers/taxpayers.service';

@Injectable()
export class PrefillService {
  constructor(
    @InjectModel(PrefillData.name) private prefillDataModel: Model<PrefillDataDocument>,
    private eriService: EriService,
    private taxpayersService: TaxpayersService,
  ) {}

  async startPrefill(taxpayerId: string, clientId: string, assessmentYear: string, userId: string): Promise<any> {
    const taxpayer = await this.taxpayersService.findById(taxpayerId, clientId);

    if (!taxpayer.isLinked) {
      throw new BadRequestException('Taxpayer must be linked before fetching prefill');
    }

    // Get or create prefill record
    let prefillData = await this.prefillDataModel
      .findOne({ taxpayerId, assessmentYear, clientId })
      .exec();

    if (!prefillData) {
      prefillData = new this.prefillDataModel({
        clientId,
        taxpayerId,
        assessmentYear,
      });
    }

    const pan = taxpayer.pan; // This would be decrypted in real implementation

    // Request OTP from ERI
    const result = await this.eriService.requestPrefillOtp(clientId, pan, assessmentYear, taxpayerId, userId);

    if (result.ok && result.transactionId) {
      prefillData.otpToken = result.transactionId;
      prefillData.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
      await prefillData.save();
    }

    return result;
  }

  async fetchPrefill(
    taxpayerId: string,
    clientId: string,
    fetchPrefillDto: FetchPrefillDto,
    userId: string,
  ): Promise<any> {
    const taxpayer = await this.taxpayersService.findById(taxpayerId, clientId);

    const prefillData = await this.prefillDataModel
      .findOne({
        taxpayerId,
        assessmentYear: fetchPrefillDto.assessmentYear,
        clientId,
      })
      .exec();

    if (!prefillData) {
      throw new NotFoundException('Prefill request not found. Start prefill first.');
    }

    const pan = taxpayer.pan; // Would be decrypted

    // Fetch from ERI
    const result = await this.eriService.getPrefill(
      clientId,
      pan,
      fetchPrefillDto.assessmentYear,
      fetchPrefillDto.otp,
      taxpayerId,
      userId,
    );

    if (result.ok) {
      // Store encrypted data
      if (result.raw.encryptedData) {
        prefillData.encryptedPayload = result.raw.encryptedData;
      }

      // Normalize data if available
      if (result.raw.personalInfo || result.raw.salaryIncome) {
        prefillData.normalizedData = this.normalizePrefillData(result.raw);
        prefillData.isDecrypted = true;
      }

      prefillData.isFetched = true;
      prefillData.fetchedAt = new Date();
      await prefillData.save();
    }

    return result;
  }

  async getLatest(taxpayerId: string, clientId: string, assessmentYear: string): Promise<any> {
    const prefillData = await this.prefillDataModel
      .findOne({ taxpayerId, assessmentYear, clientId })
      .exec();

    if (!prefillData) {
      throw new NotFoundException('No prefill data found');
    }

    if (!prefillData.isFetched) {
      throw new BadRequestException('Prefill data not yet fetched');
    }

    return {
      assessmentYear: prefillData.assessmentYear,
      isFetched: prefillData.isFetched,
      isDecrypted: prefillData.isDecrypted,
      fetchedAt: prefillData.fetchedAt,
      normalizedData: prefillData.normalizedData,
    };
  }

  private normalizePrefillData(rawData: any): any {
    // Normalize ITD prefill data structure
    // This is simplified - real implementation would have complex mapping
    return {
      personalInfo: rawData.personalInfo || {},
      salaryIncome: rawData.salaryIncome || {},
      houseProperty: rawData.houseProperty || {},
      capitalGains: rawData.capitalGains || {},
      otherSources: rawData.otherSources || {},
      deductions: rawData.deductions || {},
      taxDetails: rawData.taxDetails || {},
    };
  }
}