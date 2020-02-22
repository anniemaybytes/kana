export class CustomFailure extends Error {
  public code: string;
  public message: any;

  public constructor(code: string, message?: any) {
    super(message);
    this.code = code || 'CUSTOM_FAILURE';
    this.message = message || '';
  }
}
