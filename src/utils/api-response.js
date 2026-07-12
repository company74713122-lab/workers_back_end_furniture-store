export class ApiResponse {
    constructor(statusCode, data, message = "Operation completed successfully") {
      this.statusCode = statusCode;
      this.success = statusCode < 400;
      this.message = message;
      this.data = data;
    }
  }
  
  export class AppError extends Error {
    constructor(statusCode, message) {
      super(message);
      this.statusCode = statusCode;
      this.success = false;
    }
  }
  
  export const asyncHandler = (fn) => async (c) => {
    try {
      return await fn(c);
    } catch (error) {
      const statusCode = error.statusCode || 500;
      const message = error.message || "Internal Server Error";
      return c.json(new ApiResponse(statusCode, null, message), statusCode);
    }
  };