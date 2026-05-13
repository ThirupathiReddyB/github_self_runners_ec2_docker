export const statusCodes: any = {
  200: {
    code: 200,
    flag: "OK",
    message: "Process Successful",
  },
  201: {
    code: 201,
    flag: "Created",
    message: "Created Successful",
  },
  204: {
    code: 204,
    flag: "Not created",
    message: "Could not create",
  },

  400: {
    code: 400,
    flag: "Bad Request",
    message: "The Server could not process the request due to bad syntax",
  },
  401: {
    code: 401,
    flag: "Unauthorized",
    message: "Unauthorized access",
  },
  403: {
    code: 403,
    flag: "Forbidden",
    message: "forbidden",
  },
  500: {
    code: 500,
    flag: "Internal Server error",
    message: "An Internal Server error occured",
  },
};
//412: custom error

type RefundErrorCode = {
  status: string;
  message: string;
};
export const refundErrorCodes:Record<number, RefundErrorCode> = {
  100: { status: 'SUCCESS', message: 'Refund Successful' },
  101: { status: 'PENDING', message: 'Refund Successful' },
  102: { status: 'QUEUED', message: 'Refund Queued' },
  103: { status: 'REJECT', message: 'Request rejected on reconfirmation' },
  104: { status: 'RECONFIRM', message: 'Confirmation Required' },
  105: { status: 'FAILURE', message: 'Invalid Amount' },
  106: { status: 'FAILURE', message: 'Token already exists' },
  107: { status: 'FAILURE', message: 'Upgraded to refund' },
  108: { status: 'FAILURE', message: 'Failure' },
  109: { status: 'FAILURE', message: 'The request is already logged' },
  110: { status: 'FAILURE', message: 'More than one partial refund of Maestro transactions are not allowed' },
  111: { status: 'FAILURE', message: 'Invalid transaction status' },
  113: { status: 'FAILURE', message: 'Invalid Amount – Chargeback present' },
  115: { status: 'FAILURE', message: 'Invalid status to be uploaded' },
  116: { status: 'FAILURE', message: 'Transaction not found' },
  117: { status: 'FAILURE', message: 'The amount does not match' },
  119: { status: 'FAILURE', message: 'No such Request Found' },
  120: { status: 'FAILURE', message: 'Transaction lock could not be obtained' },
  123: { status: 'FAILURE', message: 'The request set as pending – requires manual follow-up' },
  126: { status: 'IN_PROGRESS', message: 'In Progress' },
  127: { status: 'REQUESTED', message: 'Requested' },
  214: { status: 'FAILURE', message: 'Same amount same transaction within 5 minutes' },
  225: { status: 'PENDING', message: 'Overdraft occurred. Recheck status tomorrow' },
  226: { status: 'PENDING', message: 'Capture initiated today. Check status tomorrow' },
  227: { status: 'FAILURE', message: 'Transactions with same amount and same token are not allowed' },
  230: { status: 'FAILURE', message: 'Purged Transaction. Requires manual follow-up' },
  231: { status: 'FAILURE', message: 'Hold settlement' },
  232: { status: 'FAILURE', message: 'Refund could not be initiated. Manual intervention required' },
  233: { status: 'FAILURE', message: 'Refund Blocked. Contact KM' },
  234: { status: 'FAILURE', message: 'Refund Blocked. Contact KM for API and Merchant Panel' },
  235: { status: 'FAILURE', message: 'Refund Blocked. Contact KM' },
  236: { status: 'FAILURE', message: 'Refund not possible' },
  237: { status: 'FAILURE', message: 'Validation Failure – Special Characters Not Allowed' },
  238: { status: 'FAILURE', message: 'Validation Failure – Mandatory Field Missing' },
  239: { status: 'FAILURE', message: 'API-based instant refunds not activated' },
  250: { status: 'FAILURE', message: 'Refund Failed On Uploading Successful Chargeback' },
  251: { status: 'FAILURE', message: 'Refund Blocked for this PGMID by Bank' },
  301: { status: 'FAILURE', message: 'Capture already successful for this transaction' },
  302: { status: 'FAILURE', message: 'Please try after some time' },
  303: { status: 'FAILURE', message: 'Amount greater than the maximum capturable amount' },
  304: { status: 'FAILURE', message: 'Amount less than allowed' },
  305: { status: 'FAILURE', message: 'Amount more than allowed' },
  306: { status: 'FAILURE', message: 'Invalid amount tolerance configuration' },
  424: { status: 'FAILURE', message: 'Transaction upgraded to capture/refund' },
  500: { status: 'FAILURE', message: 'Some Exception Occurred' },
  501: { status: 'FAILURE', message: 'Successfully Updated (used for refunds thru file)' },
  502: { status: 'FAILURE', message: 'Failed to update' }
};
