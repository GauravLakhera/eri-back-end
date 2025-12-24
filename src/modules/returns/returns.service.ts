import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Return, ReturnDocument, ReturnStatus } from './schemas/return.schema';
import { ReturnVersion, ReturnVersionDocument } from './schemas/return-version.schema';
import { Verification, VerificationDocument, VerificationMode } from './schemas/verification.schema';
import { Acknowledgement, AcknowledgementDocument } from './schemas/acknowledgement.schema';
import { CreateReturnDto } from './dto/create-return.dto';
import { DraftReturnDto } from './dto/draft-return.dto';
import { VerificationModeDto, GenerateEvcDto, VerifyEvcDto } from './dto/verification.dto';
import { EriService } from '../eri/eri.service';
import { StorageService } from '../storage/storage.service';
import { TaxpayersService } from '../taxpayers/taxpayers.service';

@Injectable()
export class ReturnsService {
  constructor(
    @InjectModel(Return.name) private returnModel: Model<ReturnDocument>,
    @InjectModel(ReturnVersion.name) private returnVersionModel: Model<ReturnVersionDocument>,
    @InjectModel(Verification.name) private verificationModel: Model<VerificationDocument>,
    @InjectModel(Acknowledgement.name) private acknowledgementModel: Model<AcknowledgementDocument>,
    private eriService: EriService,
    private storageService: StorageService,
    private taxpayersService: TaxpayersService,
  ) {}

  async create(clientId: string, userId: string, createReturnDto: CreateReturnDto): Promise<ReturnDocument> {
    // Verify taxpayer exists and belongs to client
    await this.taxpayersService.findById(createReturnDto.taxpayerId, clientId);

    const returnDoc = new this.returnModel({
      clientId,
      createdById: userId,
      ...createReturnDto,
    });

    const saved = await returnDoc.save();

    // Create initial version
    await this.createVersion(saved._id.toString(), 1, {}, 'Initial draft');

    return saved;
  }

  async findAll(clientId: string, page: number = 1, pageSize: number = 20) {
    const skip = (page - 1) * pageSize;

    const [returns, total] = await Promise.all([
      this.returnModel
        .find({ clientId })
        .populate('taxpayerId', 'firstName lastName')
        .skip(skip)
        .limit(pageSize)
        .sort({ createdAt: -1 })
        .exec(),
      this.returnModel.countDocuments({ clientId }),
    ]);

    return {
      data: returns,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async findById(id: string, clientId: string): Promise<any> {
    const returnDoc = await this.returnModel
      .findOne({ _id: id, clientId })
      .populate('taxpayerId')
      .populate('createdById', 'firstName lastName email')
      .exec();

    if (!returnDoc) {
      throw new NotFoundException('Return not found');
    }

    // Get latest version
    const latestVersion = await this.returnVersionModel
      .findOne({ returnId: id })
      .sort({ version: -1 })
      .exec();

    // Get verification if exists
    const verification = await this.verificationModel.findOne({ returnId: id }).exec();

    // Get acknowledgement if exists
    const acknowledgement = await this.acknowledgementModel.findOne({ returnId: id }).exec();

    return {
      ...returnDoc.toObject(),
      latestVersion: latestVersion?.toObject(),
      verification: verification?.toObject(),
      acknowledgement: acknowledgement?.toObject(),
    };
  }

  async saveDraft(id: string, clientId: string, draftReturnDto: DraftReturnDto): Promise<any> {
    const returnDoc = await this.returnModel.findOne({ _id: id, clientId }).exec();

    if (!returnDoc) {
      throw new NotFoundException('Return not found');
    }

    if (![ReturnStatus.DRAFT, ReturnStatus.VALIDATION_FAILED].includes(returnDoc.status)) {
      throw new BadRequestException('Cannot edit return in current status');
    }

    // Get latest version number
    const latestVersion = await this.returnVersionModel
      .findOne({ returnId: id })
      .sort({ version: -1 })
      .exec();

    const newVersion = (latestVersion?.version || 0) + 1;

    // Create new version
    await this.createVersion(id, newVersion, draftReturnDto.localData, draftReturnDto.notes);

    return { message: 'Draft saved successfully', version: newVersion };
  }

  private async createVersion(returnId: string, version: number, localData: any, notes?: string) {
    const versionDoc = new this.returnVersionModel({
      returnId,
      version,
      localData,
      notes,
    });

    return versionDoc.save();
  }

  async buildPayload(id: string, clientId: string): Promise<any> {
    const returnDoc = await this.returnModel.findOne({ _id: id, clientId }).exec();

    if (!returnDoc) {
      throw new NotFoundException('Return not found');
    }

    const latestVersion = await this.returnVersionModel
      .findOne({ returnId: id })
      .sort({ version: -1 })
      .exec();

    if (!latestVersion) {
      throw new BadRequestException('No draft data found');
    }

    // Build ITR payload from localData
    // This is a simplified version - real implementation would have complex mapping
    const itrPayload = {
      itrType: returnDoc.returnType,
      assessmentYear: returnDoc.assessmentYear,
      filingType: 'ORIGINAL',
      ...latestVersion.localData,
    };

    // Save payload to version
    latestVersion.itrPayload = itrPayload;
    await latestVersion.save();

    return { message: 'Payload built successfully', itrPayload };
  }

  async validate(id: string, clientId: string, userId: string): Promise<any> {
    const returnDoc = await this.returnModel.findOne({ _id: id, clientId }).populate('taxpayerId').exec();

    if (!returnDoc) {
      throw new NotFoundException('Return not found');
    }

    const latestVersion = await this.returnVersionModel
      .findOne({ returnId: id })
      .sort({ version: -1 })
      .exec();

    if (!latestVersion?.itrPayload) {
      throw new BadRequestException('Build payload first');
    }

    // Update status
    returnDoc.status = ReturnStatus.VALIDATING;
    await returnDoc.save();

    // Call ERI validate
    const result = await this.eriService.validateItr(clientId, latestVersion.itrPayload, id, userId);

    // Update status based on result
    if (result.ok) {
      returnDoc.status = ReturnStatus.VALIDATED;
      returnDoc.lastValidatedAt = new Date();
      returnDoc.validationErrors = null;
    } else {
      returnDoc.status = ReturnStatus.VALIDATION_FAILED;
      returnDoc.validationErrors = result.errors;
    }

    await returnDoc.save();

    return result;
  }

  async submit(id: string, clientId: string, userId: string): Promise<any> {
    const returnDoc = await this.returnModel.findOne({ _id: id, clientId }).populate('taxpayerId').exec();

    if (!returnDoc) {
      throw new NotFoundException('Return not found');
    }

    if (returnDoc.status !== ReturnStatus.VALIDATED) {
      throw new BadRequestException('Return must be validated before submission');
    }

    const latestVersion = await this.returnVersionModel
      .findOne({ returnId: id })
      .sort({ version: -1 })
      .exec();

    if (!latestVersion?.itrPayload) {
      throw new BadRequestException('No payload found');
    }

    // Update status
    returnDoc.status = ReturnStatus.SUBMITTING;
    await returnDoc.save();

    // Call ERI submit
    const result = await this.eriService.submitItr(clientId, latestVersion.itrPayload, id, userId);

    // Update status based on result
    if (result.ok) {
      returnDoc.status = ReturnStatus.SUBMITTED;
      returnDoc.arnNumber = result.raw.arn;
      returnDoc.acknowledgementNumber = result.raw.acknowledgementNumber;
      returnDoc.filedDate = new Date(result.raw.filedDate);
    } else {
      returnDoc.status = ReturnStatus.FAILED;
    }

    await returnDoc.save();

    return result;
  }

  async setVerificationMode(
    id: string,
    clientId: string,
    verificationModeDto: VerificationModeDto,
    userId: string,
  ): Promise<any> {
    const returnDoc = await this.returnModel.findOne({ _id: id, clientId }).populate('taxpayerId').exec();

    if (!returnDoc) {
      throw new NotFoundException('Return not found');
    }

    if (returnDoc.status !== ReturnStatus.SUBMITTED) {
      throw new BadRequestException('Return must be submitted before setting verification mode');
    }

    const taxpayer = returnDoc.taxpayerId as any;
    const pan = taxpayer.pan; // Would need to decrypt from service

    // Call ERI
    const result = await this.eriService.updateVerificationMode(
      clientId,
      pan,
      returnDoc.assessmentYear,
      verificationModeDto.mode,
      id,
      userId,
    );

    if (result.ok) {
      // Create or update verification record
      await this.verificationModel.findOneAndUpdate(
        { returnId: id },
        {
          returnId: id,
          mode: verificationModeDto.mode,
        },
        { upsert: true, new: true },
      );

      returnDoc.status = ReturnStatus.VERIFYING;
      await returnDoc.save();
    }

    return result;
  }

  async generateEvc(id: string, clientId: string, generateEvcDto: GenerateEvcDto, userId: string): Promise<any> {
    const returnDoc = await this.returnModel.findOne({ _id: id, clientId }).populate('taxpayerId').exec();

    if (!returnDoc) {
      throw new NotFoundException('Return not found');
    }

    const taxpayer = returnDoc.taxpayerId as any;
    const pan = taxpayer.pan; // Would need to decrypt

    // Call ERI
    const result = await this.eriService.generateEvc(
      clientId,
      pan,
      returnDoc.assessmentYear,
      generateEvcDto.evcMode,
      id,
      userId,
    );

    if (result.ok && result.transactionId) {
      // Update verification record
      await this.verificationModel.findOneAndUpdate(
        { returnId: id },
        {
          evcToken: result.transactionId,
          evcExpiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
        },
      );
    }

    return result;
  }

  async verifyEvc(id: string, clientId: string, verifyEvcDto: VerifyEvcDto, userId: string): Promise<any> {
    const returnDoc = await this.returnModel.findOne({ _id: id, clientId }).populate('taxpayerId').exec();

    if (!returnDoc) {
      throw new NotFoundException('Return not found');
    }

    const verification = await this.verificationModel.findOne({ returnId: id }).exec();

    if (!verification) {
      throw new BadRequestException('Verification not initiated');
    }

    const taxpayer = returnDoc.taxpayerId as any;
    const pan = taxpayer.pan; // Would need to decrypt

    // Call ERI
    const result = await this.eriService.verifyEvc(
      clientId,
      pan,
      returnDoc.assessmentYear,
      verifyEvcDto.otp,
      id,
      userId,
    );

    if (result.ok) {
      verification.isVerified = true;
      verification.verifiedAt = new Date();
      await verification.save();

      returnDoc.status = ReturnStatus.VERIFIED;
      await returnDoc.save();
    } else {
      verification.evcAttempts += 1;
      await verification.save();
    }

    return result;
  }

  async downloadAcknowledgement(id: string, clientId: string, userId: string): Promise<any> {
    const returnDoc = await this.returnModel.findOne({ _id: id, clientId }).populate('taxpayerId').exec();

    if (!returnDoc) {
      throw new NotFoundException('Return not found');
    }

    if (returnDoc.status !== ReturnStatus.VERIFIED) {
      throw new BadRequestException('Return must be verified to download acknowledgement');
    }

    const taxpayer = returnDoc.taxpayerId as any;
    const pan = taxpayer.pan; // Would need to decrypt

    // Call ERI
    const result = await this.eriService.getAcknowledgement(
      clientId,
      pan,
      returnDoc.assessmentYear,
      returnDoc.arnNumber,
      id,
      userId,
    );

    if (result.ok && result.raw.acknowledgementPdf) {
      // Decode PDF
      const pdfBuffer = Buffer.from(result.raw.acknowledgementPdf, 'base64');

      // Upload to S3
      const s3Key = `ack/${clientId}/${id}/acknowledgement.pdf`;
      await this.storageService.uploadFile(s3Key, pdfBuffer, 'application/pdf');

      // Save acknowledgement record
      const acknowledgement = new this.acknowledgementModel({
        returnId: id,
        s3Key,
        s3Bucket: process.env.S3_BUCKET,
        fileSize: pdfBuffer.length,
      });

      await acknowledgement.save();

      returnDoc.status = ReturnStatus.ACKNOWLEDGED;
      await returnDoc.save();

      return { message: 'Acknowledgement downloaded and stored successfully' };
    }

    return result;
  }

  async getAcknowledgementUrl(id: string, clientId: string): Promise<any> {
    const returnDoc = await this.returnModel.findOne({ _id: id, clientId }).exec();

    if (!returnDoc) {
      throw new NotFoundException('Return not found');
    }

    const acknowledgement = await this.acknowledgementModel.findOne({ returnId: id }).exec();

    if (!acknowledgement) {
      throw new NotFoundException('Acknowledgement not found');
    }

    // Generate signed URL
    const url = await this.storageService.getSignedDownloadUrl(acknowledgement.s3Key, 3600);

    // Update download count
    acknowledgement.downloadCount += 1;
    acknowledgement.lastDownloadAt = new Date();
    await acknowledgement.save();

    return { url, expiresIn: 3600 };
  }
}