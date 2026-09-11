export interface ApiResponse<T = unknown> {
  statusCode: number;
  error: boolean;
  message: string;
  data: T | null;
}