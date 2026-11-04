export class CmsHttpError extends Error {
  readonly status: number;
  readonly safeMessage: string;

  constructor(status: number, safeMessage: string) {
    super(safeMessage);
    this.name = "CmsHttpError";
    this.status = status;
    this.safeMessage = safeMessage;
  }
}

export class CmsAuthError extends CmsHttpError {
  constructor(status: 401 | 403 | 503, safeMessage: string) {
    super(status, safeMessage);
    this.name = "CmsAuthError";
  }
}

export class CmsValidationError extends CmsHttpError {
  constructor(safeMessage: string) {
    super(400, safeMessage);
    this.name = "CmsValidationError";
  }
}

export class CmsConflictError extends CmsHttpError {
  constructor(safeMessage = "The CMS document changed; reload and try again.") {
    super(409, safeMessage);
    this.name = "CmsConflictError";
  }
}

export class CmsNotFoundError extends CmsHttpError {
  constructor(safeMessage = "Not found") {
    super(404, safeMessage);
    this.name = "CmsNotFoundError";
  }
}

export class CmsStorageError extends CmsHttpError {
  constructor(safeMessage = "CMS storage is unavailable.") {
    super(503, safeMessage);
    this.name = "CmsStorageError";
  }
}
