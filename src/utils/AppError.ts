export class AppError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly code: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }

  static badRequest(msg: string, details?: unknown) {
    return new AppError(400, msg, 'bad_request', details);
  }
  static unauthorized(msg = 'Missing or invalid credentials') {
    return new AppError(401, msg, 'unauthorized');
  }
  static forbidden(msg = 'Not allowed') {
    return new AppError(403, msg, 'forbidden');
  }
  static notFound(msg = 'Not found') {
    return new AppError(404, msg, 'not_found');
  }
  static notImplemented(msg: string) {
    return new AppError(501, msg, 'not_implemented');
  }
}
