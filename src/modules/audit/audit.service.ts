import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EriTransaction, EriTransactionDocument } from './schemas/eri-transaction.schema';

@Injectable()
export class AuditService {
  constructor(@InjectModel(EriTransaction.name) private eriTransactionModel: Model<EriTransactionDocument>) {}

  async logTransaction(data: {
    clientId: string;
    userId: string;
    transactionType: string;
    endpoint: string;
    requestPayload: any;
    responseStatus: number;
    responseBody: any;
    duration: number;
    isError: boolean;
    errorMessage?: string;
    referenceId?: string;
    referenceType?: string;
  }): Promise<void> {
    try {
      // Sanitize sensitive data
      const sanitizedRequest = this.sanitizeData(data.requestPayload);
      const sanitizedResponse = this.sanitizeData(data.responseBody);

      const transaction = new this.eriTransactionModel({
        ...data,
        requestPayload: sanitizedRequest,
        responseBody: sanitizedResponse,
      });

      await transaction.save();
    } catch (error) {
      console.error('Failed to log audit transaction:', error);
    }
  }

  private sanitizeData(data: any): any {
    if (!data) return data;

    const sanitized = JSON.parse(JSON.stringify(data));
    const sensitiveFields = ['password', 'pan', 'dob', 'otp', 'pfxPassword', 'clientSecret', 'authToken'];

    const sanitizeObject = (obj: any) => {
      for (const key in obj) {
        if (sensitiveFields.includes(key)) {
          obj[key] = '***REDACTED***';
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          sanitizeObject(obj[key]);
        }
      }
    };

    sanitizeObject(sanitized);
    return sanitized;
  }

  async findAll(clientId: string, filters: any, page: number = 1, pageSize: number = 50) {
    const skip = (page - 1) * pageSize;
    const query: any = { clientId };

    if (filters.transactionType) {
      query.transactionType = filters.transactionType;
    }

    if (filters.isError !== undefined) {
      query.isError = filters.isError;
    }

    if (filters.startDate || filters.endDate) {
      query.createdAt = {};
      if (filters.startDate) {
        query.createdAt.$gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        query.createdAt.$lte = new Date(filters.endDate);
      }
    }

    const [transactions, total] = await Promise.all([
      this.eriTransactionModel
        .find(query)
        .skip(skip)
        .limit(pageSize)
        .sort({ createdAt: -1 })
        .exec(),
      this.eriTransactionModel.countDocuments(query),
    ]);

    return {
      data: transactions,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }
}