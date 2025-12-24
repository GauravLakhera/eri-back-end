import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, body, user } = request;
    const now = Date.now();

    // Mask sensitive data in logs
    const sanitizedBody = this.sanitizeBody(body);

    this.logger.log(
      `[REQUEST] ${method} ${url} - User: ${user?.email || 'Anonymous'} - Body: ${JSON.stringify(sanitizedBody)}`,
    );

    return next.handle().pipe(
      tap(() => {
        const responseTime = Date.now() - now;
        this.logger.log(`[RESPONSE] ${method} ${url} - ${responseTime}ms`);
      }),
    );
  }

  private sanitizeBody(body: any): any {
    if (!body) return body;

    const sanitized = { ...body };

    // Remove sensitive fields
    const sensitiveFields = ['password', 'pan', 'dob', 'otp', 'pfxPassword', 'clientSecret'];

    sensitiveFields.forEach((field) => {
      if (sanitized[field]) {
        sanitized[field] = '***REDACTED***';
      }
    });

    return sanitized;
  }
}