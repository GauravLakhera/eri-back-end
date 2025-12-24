import axios, { AxiosInstance } from 'axios';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { SessionManager } from '../session/session-manager';
import { RequestBuilder } from '../request/request-builder';
import { createSigner } from '../signer/signer.factory';
import { EriResponse } from '../types/eri.types';
import { AuditService } from '../../audit/audit.service';

export class EriClient {
  private readonly logger = new Logger(EriClient.name);
  private axiosInstance: AxiosInstance;
  private sessionManager: SessionManager;
  private requestBuilder: RequestBuilder;
  private readonly baseUrl: string;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly userId: string;
  private readonly mockMode: boolean;
  private readonly tenantClientId: string; // The client ID from our DB (for session storage)
  private auditService: AuditService | null = null;

  constructor(
    configService: ConfigService,
    tenantClientId: string,
    auditService?: AuditService,
  ) {
    this.baseUrl = configService.get<string>('ERI_BASE_URL') || 'https://uat.incometax.gov.in/eri';
    this.clientId = configService.get<string>('ERI_CLIENT_ID') || 'mock-client-id';
    this.clientSecret = configService.get<string>('ERI_CLIENT_SECRET') || 'mock-client-secret';
    this.userId = configService.get<string>('ERI_USER_ID') || 'mock-user-id';
    this.mockMode = configService.get<string>('ERI_MOCK_MODE') === 'true';
    this.tenantClientId = tenantClientId;
    this.auditService = auditService || null;

    this.sessionManager = new SessionManager(configService);

    const signer = createSigner();
    this.requestBuilder = new RequestBuilder(signer, this.userId);

    this.axiosInstance = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.logger.log(`ERI Client initialized for tenant: ${tenantClientId} (Mock: ${this.mockMode})`);
  }

  private async ensureAuthenticated(): Promise<string> {
    // Get session using tenantClientId
    const session = await this.sessionManager.getSession(this.tenantClientId);

    if (session && session.expiresAt > Date.now()) {
      this.logger.log('Using cached session');
      return session.authToken;
    }

    // Session expired or doesn't exist, login
    this.logger.log('Session expired or not found, logging in...');
    const loginResult = await this.login();
    return loginResult.authToken || '';
  }

  async login(): Promise<EriResponse> {
    const startTime = Date.now();

    try {
      if (this.mockMode) {
        this.logger.log('Mock mode: Simulating login');
        const mockToken = 'mock-auth-token-' + Date.now();
        const expiresAt = Date.now() + (25 * 60 * 1000); // 25 minutes

        await this.sessionManager.saveSession(
          this.tenantClientId,
          { authToken: mockToken, expiresAt },
          1500 // 25 minutes
        );

        const response = {
          ok: true,
          messages: ['Login successful (mock)'],
          errors: [],
          raw: { authToken: mockToken },
          authToken: mockToken,
        };

        await this.logTransaction('ERI_LOGIN', {}, response, Date.now() - startTime, false);
        return response;
      }

      const payload = {};
      const { data, sign } = await this.requestBuilder.build(payload);

      const response = await this.axiosInstance.post('/api/eriLogin', {
        data,
        sign,
        eriUserId: this.userId,
      }, {
        headers: {
          clientId: this.clientId,
          clientSecret: this.clientSecret,
          accessMode: 'API',
        },
      });

      const result = this.requestBuilder.parseResponse(response.data);

      if (result.ok && result.authToken) {
        const expiresAt = Date.now() + (25 * 60 * 1000); // 25 minutes

        await this.sessionManager.saveSession(
          this.tenantClientId,
          { authToken: result.authToken, expiresAt },
          1500
        );

        this.logger.log('Login successful, session cached');
      }

      await this.logTransaction('ERI_LOGIN', payload, result, Date.now() - startTime, !result.ok);
      return result;

    } catch (error: any) {
      this.logger.error('Login failed:', error.message);
      const result = {
        ok: false,
        messages: [],
        errors: [error.message],
        raw: {},
      };
      await this.logTransaction('ERI_LOGIN', {}, result, Date.now() - startTime, true, error.message);
      return result;
    }
  }

  async logout(): Promise<EriResponse> {
    const startTime = Date.now();

    try {
      await this.sessionManager.clearSession(this.tenantClientId);

      if (this.mockMode) {
        const response = {
          ok: true,
          messages: ['Logout successful (mock)'],
          errors: [],
          raw: {},
        };
        await this.logTransaction('ERI_LOGOUT', {}, response, Date.now() - startTime, false);
        return response;
      }

      const authToken = await this.ensureAuthenticated();
      const payload = {};
      const { data, sign } = await this.requestBuilder.build(payload);

      const response = await this.axiosInstance.post('/api/eriLogout', {
        data,
        sign,
        eriUserId: this.userId,
      }, {
        headers: {
          clientId: this.clientId,
          clientSecret: this.clientSecret,
          authToken,
          accessMode: 'API',
        },
      });

      const result = this.requestBuilder.parseResponse(response.data);
      await this.logTransaction('ERI_LOGOUT', payload, result, Date.now() - startTime, !result.ok);
      return result;

    } catch (error: any) {
      const result = {
        ok: false,
        messages: [],
        errors: [error.message],
        raw: {},
      };
      await this.logTransaction('ERI_LOGOUT', {}, result, Date.now() - startTime, true, error.message);
      return result;
    }
  }

  async addClient(pan: string, dob: string): Promise<EriResponse> {
    const startTime = Date.now();

    try {
      if (this.mockMode) {
        this.logger.log('Mock mode: Simulating addClient');
        const response = {
          ok: true,
          messages: ['OTP sent to registered mobile (mock)'],
          errors: [],
          raw: {},
          transactionId: 'MOCK_TXN_' + Date.now(),
        };
        await this.logTransaction('ADD_CLIENT', { pan: 'XX******XX', dob }, response, Date.now() - startTime, false);
        return response;
      }

      const authToken = await this.ensureAuthenticated();
      const payload = { pan, dob };
      const { data, sign } = await this.requestBuilder.build(payload);

      const response = await this.axiosInstance.post('/api/eriAddClient', {
        data,
        sign,
        eriUserId: this.userId,
      }, {
        headers: {
          clientId: this.clientId,
          clientSecret: this.clientSecret,
          authToken,
          accessMode: 'API',
        },
      });

      const result = this.requestBuilder.parseResponse(response.data);
      await this.logTransaction('ADD_CLIENT', { pan: 'XX******XX', dob }, result, Date.now() - startTime, !result.ok);
      return result;

    } catch (error: any) {
      const result = {
        ok: false,
        messages: [],
        errors: [error.message],
        raw: {},
      };
      await this.logTransaction('ADD_CLIENT', { pan: 'XX******XX', dob }, result, Date.now() - startTime, true, error.message);
      return result;
    }
  }

  async validateClientOtp(pan: string, otp: string): Promise<EriResponse> {
    const startTime = Date.now();

    try {
      if (this.mockMode) {
        this.logger.log('Mock mode: Simulating validateClientOtp');
        const response = {
          ok: true,
          messages: ['Client linked successfully (mock)'],
          errors: [],
          raw: {},
        };
        await this.logTransaction('VALIDATE_CLIENT_OTP', { pan: 'XX******XX', otp: '******' }, response, Date.now() - startTime, false);
        return response;
      }

      const authToken = await this.ensureAuthenticated();
      const payload = { pan, otp };
      const { data, sign } = await this.requestBuilder.build(payload);

      const response = await this.axiosInstance.post('/api/eriValidateClientOTP', {
        data,
        sign,
        eriUserId: this.userId,
      }, {
        headers: {
          clientId: this.clientId,
          clientSecret: this.clientSecret,
          authToken,
          accessMode: 'API',
        },
      });

      const result = this.requestBuilder.parseResponse(response.data);
      await this.logTransaction('VALIDATE_CLIENT_OTP', { pan: 'XX******XX', otp: '******' }, result, Date.now() - startTime, !result.ok);
      return result;

    } catch (error: any) {
      const result = {
        ok: false,
        messages: [],
        errors: [error.message],
        raw: {},
      };
      await this.logTransaction('VALIDATE_CLIENT_OTP', { pan: 'XX******XX', otp: '******' }, result, Date.now() - startTime, true, error.message);
      return result;
    }
  }

  async requestPrefillOtp(pan: string, assessmentYear: string): Promise<EriResponse> {
    const startTime = Date.now();

    try {
      if (this.mockMode) {
        this.logger.log('Mock mode: Simulating requestPrefillOtp');
        const response = {
          ok: true,
          messages: ['Prefill OTP sent (mock)'],
          errors: [],
          raw: {},
          transactionId: 'PREFILL_TXN_' + Date.now(),
        };
        await this.logTransaction('REQUEST_PREFILL_OTP', { pan: 'XX******XX', assessmentYear }, response, Date.now() - startTime, false);
        return response;
      }

      const authToken = await this.ensureAuthenticated();
      const payload = { pan, assessmentYear };
      const { data, sign } = await this.requestBuilder.build(payload);

      const response = await this.axiosInstance.post('/api/eriRequestPrefillOTP', {
        data,
        sign,
        eriUserId: this.userId,
      }, {
        headers: {
          clientId: this.clientId,
          clientSecret: this.clientSecret,
          authToken,
          accessMode: 'API',
        },
      });

      const result = this.requestBuilder.parseResponse(response.data);
      await this.logTransaction('REQUEST_PREFILL_OTP', { pan: 'XX******XX', assessmentYear }, result, Date.now() - startTime, !result.ok);
      return result;

    } catch (error: any) {
      const result = {
        ok: false,
        messages: [],
        errors: [error.message],
        raw: {},
      };
      await this.logTransaction('REQUEST_PREFILL_OTP', { pan: 'XX******XX', assessmentYear }, result, Date.now() - startTime, true, error.message);
      return result;
    }
  }

  async getPrefill(pan: string, assessmentYear: string, otp: string): Promise<EriResponse> {
    const startTime = Date.now();

    try {
      if (this.mockMode) {
        this.logger.log('Mock mode: Simulating getPrefill');
        const mockPrefillData = {
          personalInfo: {
            name: 'John Doe',
            pan,
            mobile: '+91-9876543210',
          },
          salaryIncome: {
            employer: 'ABC Corp',
            salary: 1200000,
            tds: 120000,
          },
          houseProperty: {
            address: '123 Main St',
            rent: 240000,
          },
        };

        const response = {
          ok: true,
          messages: ['Prefill data fetched (mock)'],
          errors: [],
          raw: { prefillData: mockPrefillData },
          prefillData: mockPrefillData,
        };
        await this.logTransaction('GET_PREFILL', { pan: 'XX******XX', assessmentYear, otp: '******' }, response, Date.now() - startTime, false);
        return response;
      }

      const authToken = await this.ensureAuthenticated();
      const payload = { pan, assessmentYear, otp };
      const { data, sign } = await this.requestBuilder.build(payload);

      const response = await this.axiosInstance.post('/api/eriGetPrefill', {
        data,
        sign,
        eriUserId: this.userId,
      }, {
        headers: {
          clientId: this.clientId,
          clientSecret: this.clientSecret,
          authToken,
          accessMode: 'API',
        },
      });

      const result = this.requestBuilder.parseResponse(response.data);
      await this.logTransaction('GET_PREFILL', { pan: 'XX******XX', assessmentYear, otp: '******' }, result, Date.now() - startTime, !result.ok);
      return result;

    } catch (error: any) {
      const result = {
        ok: false,
        messages: [],
        errors: [error.message],
        raw: {},
      };
      await this.logTransaction('GET_PREFILL', { pan: 'XX******XX', assessmentYear, otp: '******' }, result, Date.now() - startTime, true, error.message);
      return result;
    }
  }

  async validateItr(itrPayload: any): Promise<EriResponse> {
    const startTime = Date.now();

    try {
      if (this.mockMode) {
        this.logger.log('Mock mode: Simulating validateItr');
        const response = {
          ok: true,
          messages: ['Return validation successful (mock)'],
          errors: [],
          raw: {},
        };
        await this.logTransaction('VALIDATE_ITR', { itrType: itrPayload.returnType }, response, Date.now() - startTime, false);
        return response;
      }

      const authToken = await this.ensureAuthenticated();
      const { data, sign } = await this.requestBuilder.build(itrPayload);

      const response = await this.axiosInstance.post('/api/eriValidateItr', {
        data,
        sign,
        eriUserId: this.userId,
      }, {
        headers: {
          clientId: this.clientId,
          clientSecret: this.clientSecret,
          authToken,
          accessMode: 'API',
        },
      });

      const result = this.requestBuilder.parseResponse(response.data);
      await this.logTransaction('VALIDATE_ITR', { itrType: itrPayload.returnType }, result, Date.now() - startTime, !result.ok);
      return result;

    } catch (error: any) {
      const result = {
        ok: false,
        messages: [],
        errors: [error.message],
        raw: {},
      };
      await this.logTransaction('VALIDATE_ITR', { itrType: itrPayload.returnType }, result, Date.now() - startTime, true, error.message);
      return result;
    }
  }

  async submitItr(itrPayload: any): Promise<EriResponse> {
    const startTime = Date.now();

    try {
      if (this.mockMode) {
        this.logger.log('Mock mode: Simulating submitItr');
        const mockArn = 'ARN-' + Date.now() + '-' + new Date().toISOString().split('T')[0].replace(/-/g, '');
        const response = {
          ok: true,
          messages: ['Return submitted successfully (mock)'],
          errors: [],
          raw: {
            arn: mockArn,
            acknowledgementNumber: 'ACK' + Date.now(),
            filedDate: new Date().toISOString(),
          },
          arn: mockArn,
        };
        await this.logTransaction('SUBMIT_ITR', { itrType: itrPayload.returnType }, response, Date.now() - startTime, false);
        return response;
      }

      const authToken = await this.ensureAuthenticated();
      const { data, sign } = await this.requestBuilder.build(itrPayload);

      const response = await this.axiosInstance.post('/api/eriSubmitItr', {
        data,
        sign,
        eriUserId: this.userId,
      }, {
        headers: {
          clientId: this.clientId,
          clientSecret: this.clientSecret,
          authToken,
          accessMode: 'API',
        },
      });

      const result = this.requestBuilder.parseResponse(response.data);
      await this.logTransaction('SUBMIT_ITR', { itrType: itrPayload.returnType }, result, Date.now() - startTime, !result.ok);
      return result;

    } catch (error: any) {
      const result = {
        ok: false,
        messages: [],
        errors: [error.message],
        raw: {},
      };
      await this.logTransaction('SUBMIT_ITR', { itrType: itrPayload.returnType }, result, Date.now() - startTime, true, error.message);
      return result;
    }
  }

  async updateVerificationMode(pan: string, assessmentYear: string, mode: string): Promise<EriResponse> {
    const startTime = Date.now();

    try {
      if (this.mockMode) {
        this.logger.log('Mock mode: Simulating updateVerificationMode');
        const response = {
          ok: true,
          messages: ['Verification mode updated (mock)'],
          errors: [],
          raw: {},
        };
        await this.logTransaction('UPDATE_VERIFICATION_MODE', { pan: 'XX******XX', assessmentYear, mode }, response, Date.now() - startTime, false);
        return response;
      }

      const authToken = await this.ensureAuthenticated();
      const payload = { pan, assessmentYear, verificationMode: mode };
      const { data, sign } = await this.requestBuilder.build(payload);

      const response = await this.axiosInstance.post('/api/eriUpdateVerMode', {
        data,
        sign,
        eriUserId: this.userId,
      }, {
        headers: {
          clientId: this.clientId,
          clientSecret: this.clientSecret,
          authToken,
          accessMode: 'API',
        },
      });

      const result = this.requestBuilder.parseResponse(response.data);
      await this.logTransaction('UPDATE_VERIFICATION_MODE', { pan: 'XX******XX', assessmentYear, mode }, result, Date.now() - startTime, !result.ok);
      return result;

    } catch (error: any) {
      const result = {
        ok: false,
        messages: [],
        errors: [error.message],
        raw: {},
      };
      await this.logTransaction('UPDATE_VERIFICATION_MODE', { pan: 'XX******XX', assessmentYear, mode }, result, Date.now() - startTime, true, error.message);
      return result;
    }
  }

  async generateEvc(pan: string, assessmentYear: string, evcMode: string): Promise<EriResponse> {
    const startTime = Date.now();

    try {
      if (this.mockMode) {
        this.logger.log('Mock mode: Simulating generateEvc');
        const response = {
          ok: true,
          messages: ['EVC sent to registered mobile/email (mock)'],
          errors: [],
          raw: {},
          transactionId: 'EVC_TXN_' + Date.now(),
        };
        await this.logTransaction('GENERATE_EVC', { pan: 'XX******XX', assessmentYear, evcMode }, response, Date.now() - startTime, false);
        return response;
      }

      const authToken = await this.ensureAuthenticated();
      const payload = { pan, assessmentYear, evcMode };
      const { data, sign } = await this.requestBuilder.build(payload);

      const response = await this.axiosInstance.post('/api/eriGenerateEVC', {
        data,
        sign,
        eriUserId: this.userId,
      }, {
        headers: {
          clientId: this.clientId,
          clientSecret: this.clientSecret,
          authToken,
          accessMode: 'API',
        },
      });

      const result = this.requestBuilder.parseResponse(response.data);
      await this.logTransaction('GENERATE_EVC', { pan: 'XX******XX', assessmentYear, evcMode }, result, Date.now() - startTime, !result.ok);
      return result;

    } catch (error: any) {
      const result = {
        ok: false,
        messages: [],
        errors: [error.message],
        raw: {},
      };
      await this.logTransaction('GENERATE_EVC', { pan: 'XX******XX', assessmentYear, evcMode }, result, Date.now() - startTime, true, error.message);
      return result;
    }
  }

  async verifyEvc(pan: string, assessmentYear: string, otp: string): Promise<EriResponse> {
    const startTime = Date.now();

    try {
      if (this.mockMode) {
        this.logger.log('Mock mode: Simulating verifyEvc');
        const response = {
          ok: true,
          messages: ['Return verified successfully (mock)'],
          errors: [],
          raw: { verifiedDate: new Date().toISOString() },
        };
        await this.logTransaction('VERIFY_EVC', { pan: 'XX******XX', assessmentYear, otp: '******' }, response, Date.now() - startTime, false);
        return response;
      }

      const authToken = await this.ensureAuthenticated();
      const payload = { pan, assessmentYear, otp };
      const { data, sign } = await this.requestBuilder.build(payload);

      const response = await this.axiosInstance.post('/api/eriVerifyEVC', {
        data,
        sign,
        eriUserId: this.userId,
      }, {
        headers: {
          clientId: this.clientId,
          clientSecret: this.clientSecret,
          authToken,
          accessMode: 'API',
        },
      });

      const result = this.requestBuilder.parseResponse(response.data);
      await this.logTransaction('VERIFY_EVC', { pan: 'XX******XX', assessmentYear, otp: '******' }, result, Date.now() - startTime, !result.ok);
      return result;

    } catch (error: any) {
      const result = {
        ok: false,
        messages: [],
        errors: [error.message],
        raw: {},
      };
      await this.logTransaction('VERIFY_EVC', { pan: 'XX******XX', assessmentYear, otp: '******' }, result, Date.now() - startTime, true, error.message);
      return result;
    }
  }

  async getAcknowledgement(pan: string, assessmentYear: string, arn: string): Promise<EriResponse> {
    const startTime = Date.now();

    try {
      if (this.mockMode) {
        this.logger.log('Mock mode: Simulating getAcknowledgement');
        const mockPdfBase64 = 'JVBERi0xLjQKJeLjz9MKMyAwIG9iag=='; // Minimal PDF header
        const response = {
          ok: true,
          messages: ['Acknowledgement downloaded (mock)'],
          errors: [],
          raw: {
            acknowledgementPdf: mockPdfBase64,
            fileSize: 25600,
          },
          acknowledgementPdf: mockPdfBase64,
        };
        await this.logTransaction('GET_ACKNOWLEDGEMENT', { pan: 'XX******XX', assessmentYear, arn }, response, Date.now() - startTime, false);
        return response;
      }

      const authToken = await this.ensureAuthenticated();
      const payload = { pan, assessmentYear, arn };
      const { data, sign } = await this.requestBuilder.build(payload);

      const response = await this.axiosInstance.post('/api/eriGetAcknowledgement', {
        data,
        sign,
        eriUserId: this.userId,
      }, {
        headers: {
          clientId: this.clientId,
          clientSecret: this.clientSecret,
          authToken,
          accessMode: 'API',
        },
      });

      const result = this.requestBuilder.parseResponse(response.data);
      await this.logTransaction('GET_ACKNOWLEDGEMENT', { pan: 'XX******XX', assessmentYear, arn }, result, Date.now() - startTime, !result.ok);
      return result;

    } catch (error: any) {
      const result = {
        ok: false,
        messages: [],
        errors: [error.message],
        raw: {},
      };
      await this.logTransaction('GET_ACKNOWLEDGEMENT', { pan: 'XX******XX', assessmentYear, arn }, result, Date.now() - startTime, true, error.message);
      return result;
    }
  }

  private async logTransaction(
    transactionType: string,
    requestPayload: any,
    response: EriResponse,
    duration: number,
    isError: boolean,
    errorMessage?: string,
  ): Promise<void> {
    if (!this.auditService) return;

    try {
      await this.auditService.logTransaction({
        clientId: this.tenantClientId,
        userId: this.userId, // Added this line
        transactionType,
        endpoint: `/api/eri${transactionType}`,
        requestPayload,
        responseStatus: response.ok ? 200 : 500,
        responseBody: response.raw,
        duration,
        isError,
        errorMessage,
      });
    } catch (error) {
      this.logger.warn('Failed to log transaction:', error);
    }
  }
}