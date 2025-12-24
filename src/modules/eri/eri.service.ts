import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EriClient } from './client/eri-client';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class EriService {
  constructor(
    private configService: ConfigService,
    private auditService: AuditService,
  ) {}

  private getClient(clientId: string, userId?: string): EriClient {
    return new EriClient(this.configService, clientId, this.auditService);
  }

  async login(clientId: string, userId: string) {
    const client = this.getClient(clientId, userId);
    return client.login();
  }

  async logout(clientId: string, userId: string) {
    const client = this.getClient(clientId, userId);
    return client.logout();
  }

  async addClient(clientId: string, userId: string, pan: string, dob: string, taxpayerId?: string) {
    const client = this.getClient(clientId, userId);
    return client.addClient(pan, dob);
  }

  async validateClientOtp(clientId: string, userId: string, pan: string, otp: string, taxpayerId?: string) {
    const client = this.getClient(clientId, userId);
    return client.validateClientOtp(pan, otp);
  }

  async requestPrefillOtp(
    clientId: string,
    userId: string,
    pan: string,
    assessmentYear: string,
    taxpayerId?: string,
  ) {
    const client = this.getClient(clientId, userId);
    return client.requestPrefillOtp(pan, assessmentYear);
  }

  async getPrefill(
    clientId: string,
    userId: string,
    pan: string,
    assessmentYear: string,
    otp: string,
    taxpayerId?: string,
  ) {
    const client = this.getClient(clientId, userId);
    return client.getPrefill(pan, assessmentYear, otp);
  }

  async validateItr(clientId: string, userId: string, itrPayload: any, returnId?: string) {
    const client = this.getClient(clientId, userId);
    return client.validateItr(itrPayload);
  }

  async submitItr(clientId: string, userId: string, itrPayload: any, returnId?: string) {
    const client = this.getClient(clientId, userId);
    return client.submitItr(itrPayload);
  }

  async updateVerificationMode(
    clientId: string,
    userId: string,
    pan: string,
    assessmentYear: string,
    mode: string,
    returnId?: string,
  ) {
    const client = this.getClient(clientId, userId);
    return client.updateVerificationMode(pan, assessmentYear, mode);
  }

  async generateEvc(
    clientId: string,
    userId: string,
    pan: string,
    assessmentYear: string,
    evcMode: string,
    returnId?: string,
  ) {
    const client = this.getClient(clientId, userId);
    return client.generateEvc(pan, assessmentYear, evcMode);
  }

  async verifyEvc(
    clientId: string,
    userId: string,
    pan: string,
    assessmentYear: string,
    otp: string,
    returnId?: string,
  ) {
    const client = this.getClient(clientId, userId);
    return client.verifyEvc(pan, assessmentYear, otp);
  }

  async getAcknowledgement(
    clientId: string,
    userId: string,
    pan: string,
    assessmentYear: string,
    arn: string,
    returnId?: string,
  ) {
    const client = this.getClient(clientId, userId);
    return client.getAcknowledgement(pan, assessmentYear, arn);
  }
}