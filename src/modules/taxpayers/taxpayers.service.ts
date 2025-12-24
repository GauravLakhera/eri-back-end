import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Taxpayer, TaxpayerDocument } from './schemas/taxpayer.schema';
import { CreateTaxpayerDto } from './dto/create-taxpayer.dto';
import { CryptoService } from '../crypto/crypto.service';
import { EriService } from '../eri/eri.service';

@Injectable()
export class TaxpayersService {
  constructor(
    @InjectModel(Taxpayer.name) private taxpayerModel: Model<TaxpayerDocument>,
    private cryptoService: CryptoService,
    private eriService: EriService,
  ) {}

  async create(clientId: string, userId: string, createTaxpayerDto: CreateTaxpayerDto): Promise<TaxpayerDocument> {
    const { pan, dob, ...rest } = createTaxpayerDto;

    // Encrypt PAN and DOB
    const { encrypted: panEnc, hash: panHash } = this.cryptoService.encryptPan(pan);
    const dobEnc = this.cryptoService.encryptDob(dob);

    // Check for duplicate
    const existing = await this.taxpayerModel.findOne({ clientId, panHash });
    if (existing) {
      throw new ConflictException('Taxpayer with this PAN already exists');
    }

    const taxpayer = new this.taxpayerModel({
      clientId,
      createdById: userId,
      panHash,
      panEnc,
      dobEnc,
      ...rest,
    });

    return taxpayer.save();
  }

  async findAll(clientId: string, page: number = 1, pageSize: number = 20) {
    const skip = (page - 1) * pageSize;

    const [taxpayers, total] = await Promise.all([
      this.taxpayerModel
        .find({ clientId })
        .skip(skip)
        .limit(pageSize)
        .sort({ createdAt: -1 })
        .exec(),
      this.taxpayerModel.countDocuments({ clientId }),
    ]);

    // Mask PAN in response
    const maskedTaxpayers = taxpayers.map((taxpayer) => {
      const plain = taxpayer.toObject();
      const decryptedPan = this.cryptoService.decryptPan(taxpayer.panEnc);
      return {
        ...plain,
        pan: this.cryptoService.maskPan(decryptedPan),
        panEnc: undefined,
        dobEnc: undefined,
        panHash: undefined,
      };
    });

    return {
      data: maskedTaxpayers,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async findById(id: string, clientId: string): Promise<any> {
    const taxpayer = await this.taxpayerModel.findOne({ _id: id, clientId }).exec();

    if (!taxpayer) {
      throw new NotFoundException('Taxpayer not found');
    }

    // Decrypt and mask PAN
    const decryptedPan = this.cryptoService.decryptPan(taxpayer.panEnc);
    const decryptedDob = this.cryptoService.decryptDob(taxpayer.dobEnc);

    const plain = taxpayer.toObject();
    return {
      ...plain,
      pan: this.cryptoService.maskPan(decryptedPan),
      dob: decryptedDob,
      panEnc: undefined,
      dobEnc: undefined,
      panHash: undefined,
    };
  }

  async startLinkage(id: string, clientId: string, userId: string): Promise<any> {
    const taxpayer = await this.taxpayerModel.findOne({ _id: id, clientId }).exec();

    if (!taxpayer) {
      throw new NotFoundException('Taxpayer not found');
    }

    if (taxpayer.isLinked) {
      throw new BadRequestException('Taxpayer already linked');
    }

    // Decrypt PAN and DOB for ERI call
    const pan = this.cryptoService.decryptPan(taxpayer.panEnc);
    const dob = this.cryptoService.decryptDob(taxpayer.dobEnc);

    // Call ERI Add Client
    const result = await this.eriService.addClient(clientId, pan, dob, id, userId);

    // Store transaction ID
    if (result.ok && result.transactionId) {
      taxpayer.linkageToken = result.transactionId;
      await taxpayer.save();
    }

    return result;
  }

  async verifyLinkage(id: string, clientId: string, otp: string, userId: string): Promise<any> {
    const taxpayer = await this.taxpayerModel.findOne({ _id: id, clientId }).exec();

    if (!taxpayer) {
      throw new NotFoundException('Taxpayer not found');
    }

    if (taxpayer.isLinked) {
      throw new BadRequestException('Taxpayer already linked');
    }

    // Decrypt PAN
    const pan = this.cryptoService.decryptPan(taxpayer.panEnc);

    // Verify OTP with ERI
    const result = await this.eriService.validateClientOtp(clientId, pan, otp, id, userId);

    // Update linkage status
    if (result.ok) {
      taxpayer.isLinked = true;
      taxpayer.linkedAt = new Date();
      await taxpayer.save();
    }

    return result;
  }
}