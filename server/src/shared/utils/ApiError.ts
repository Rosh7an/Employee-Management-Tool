export class ApiError extends Error {
  public statusCode: number;
  public code: string;
  public field: string | null;

  constructor(
    statusCode: number,
    code: string,
    message: string,
    field: string | null = null
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.field = field;
    Object.setPrototypeOf(this, ApiError.prototype);
  }

  static badRequest(message: string, field: string | null = null) {
    return new ApiError(400, 'BAD_REQUEST', message, field);
  }

  static unauthenticated(message = 'Authentication required.') {
    return new ApiError(401, 'UNAUTHENTICATED', message);
  }

  static forbidden(message = 'You do not have permission to perform this action.') {
    return new ApiError(403, 'FORBIDDEN', message);
  }

  static notFound(message = 'Resource not found.') {
    return new ApiError(404, 'NOT_FOUND', message);
  }

  static conflict(message: string, field: string | null = null) {
    return new ApiError(409, 'CONFLICT', message, field);
  }

  static validation(message: string, field: string | null = null) {
    return new ApiError(422, 'VALIDATION_ERROR', message, field);
  }
}
